/**
 * Sidebar — 5 分区可展开侧边导航(把顶部 SubNav 下沉到这里)。
 *
 * 结构:ClusterSwitcher / 分区按钮 + 当前分区的 kind 子菜单 / WatchFooter。
 * 原本每个分区页内的 SubNav 现在由 Sidebar 渲染,App.tsx 不再挂载 SubNav —
 * 5 分区按钮 + 子菜单 = 单一一致的"导航即层级"心智。
 *
 * 展开语义:激活的分区(==store.section)自动展开子菜单;其他分区收起。
 * 收起状态下,分区按钮仍带 "▸" chevron 提示可点开;点分区按钮 = setSection(id)
 * (store 会切到该分区默认 kind + 清空选中状态)。子菜单项点击 = setNav(kind)
 * (store 会反向 setSection,等于子项点击自动带出分区高亮)。
 *
 * On iPadOS the sidebar renders as a collapsible drawer overlaying the content;
 * tapping a section closes the drawer (same contract the old NavList had).
 */

import { useMemo } from 'react';
import styles from './Sidebar.module.css';
import { ClusterSwitcher } from './ClusterSwitcher';
import { WatchFooter } from './WatchFooter';
import { SECTION_ICONS, SECTION_ORDER, SECTION_SUBGROUPS } from '../../lib/sections';
import type { SectionId } from '../../lib/sections';
import { useStore } from '../../store';
import { useCustomKinds } from '../../hooks/useStoreHooks';
import { useTranslation } from '../../hooks/useI18n';
import { kindLabelFor } from '../../lib/i18n';
import { cx } from '../../lib/cx';
import { IS_IPADOS } from '../../providers/transport';
import type { KindId } from '../../providers/types';

interface SidebarProps {
  /** Whether the sidebar drawer is open (iPadOS only). */
  open?: boolean;
  /** Close the drawer (iPadOS only — called when a section is tapped). */
  onClose?: () => void;
  /** Toggle the drawer (iPadOS only). */
  onToggle?: () => void;
}

/** 各分区的 kind 列表(平铺;config 额外追加可见的 CRD kind)。 */
function kindsForSidebar(section: SectionId, customKinds: KindId[]): KindId[] {
  if (section === 'workloads') {
    return [
      'deployments',
      'statefulsets',
      'daemonsets',
      'jobs',
      'cronjobs',
      'pods',
      'helm',
    ];
  }
  if (section === 'config') {
    const builtin = SECTION_SUBGROUPS.config.flatMap((g) => [...g.kinds]);
    // config 分区额外追加集群发现的 CRD kind(对应原 SubNav 里的 'custom' 组)
    return [...builtin, ...customKinds];
  }
  if (section === 'storage') {
    return SECTION_SUBGROUPS.storage.flatMap((g) => [...g.kinds]);
  }
  return [];
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const section = useStore((s) => s.section);
  const nav = useStore((s) => s.nav);
  const setSection = useStore((s) => s.setSection);
  const setNav = useStore((s) => s.setNav);
  const customKindsRaw = useCustomKinds();
  const customKindCounts = useStore((s) => s.customKindCounts);
  const { locale, t } = useTranslation();

  // CRD kind id 列表(供 config 分区追加)。原 SubNav 对应实现使用同样的
  // 隐藏规则:计数已知且为 0 的 kind 不展示,激活的 CRD 永远保留。
  const customKindIds = useMemo<KindId[]>(
    () =>
      customKindsRaw
        .filter((ck) => {
          if (!customKindCounts) return true;
          return customKindCounts[ck.id] > 0 || ck.id === nav;
        })
        .map((ck) => ck.id),
    [customKindsRaw, customKindCounts, nav]
  );

  // data-surface="panel": in light mode the sidebar is dark chrome (tokens.css).
  return (
    <aside
      className={cx(
        styles.sidebar,
        IS_IPADOS && styles.sidebarDrawer,
        IS_IPADOS && !open && styles.sidebarClosed
      )}
      data-surface="panel"
      data-open={open}
    >
      <ClusterSwitcher />
      <nav className={styles.rail} aria-label={t('sidebar.mainNav')}>
        {SECTION_ORDER.map((id) => {
          const isActive = section === id;
          // 只有 3 个资源分区有二级菜单(overview/tools 没有资源 kind)
          const expandables: SectionId[] = ['workloads', 'config', 'storage'];
          const hasSubmenu = expandables.includes(id);
          const subKinds = hasSubmenu ? kindsForSidebar(id, customKindIds) : [];
          return (
            <div key={id} className={styles.railGroup}>
              <button
                type="button"
                title={t(`chrome.sections.${id}`, id)}
                className={cx(styles.railItem, isActive && styles.active)}
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={hasSubmenu ? isActive : undefined}
                onClick={() => {
                  setSection(id);
                  if (IS_IPADOS) onClose?.();
                }}
              >
                {SECTION_ICONS[id]}
                <span className={styles.railLabel}>{t(`chrome.sections.${id}`, id)}</span>
                {hasSubmenu && (
                  <span className={styles.railChevron} aria-hidden="true">
                    {isActive ? '▾' : '▸'}
                  </span>
                )}
              </button>
              {hasSubmenu && isActive && (
                <ul className={styles.submenu} role="tablist">
                  {subKinds.map((k) => (
                    <li key={k}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={nav === k}
                        className={cx(styles.submenuItem, nav === k && styles.submenuItemActive)}
                        onClick={() => {
                          setNav(k);
                          if (IS_IPADOS) onClose?.();
                        }}
                      >
                        {kindLabelFor(k, customKindsRaw, locale) ?? k}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <WatchFooter />
    </aside>
  );
}