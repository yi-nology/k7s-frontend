/**
 * SubNav — 资源分区内的页内副导航(原 P1 IA 实现)。
 *
 * 历史:该组件原本在每个资源分区内容区顶部渲染水平 tab 列表(workloads
 * 平铺、config/storage 分组 + 末尾 CRD 组)。现在该职责下沉到 Sidebar:
 * 当前激活的分区按钮会展开一个 kind 子菜单,App.tsx 不再挂载本组件。
 *
 * 本文件保留为可编译的空实现 —— 若未来需要(例如桌面端紧凑布局、面包屑
 * 横条、或某个特定场景下的子标题),可以基于原来的实现重新启用。GROUP_FALLBACK
 * 常量保留,只是不再被引用。
 */

import type { SectionId } from '../../lib/sections';

/**
 * English fallbacks for `subnav.group.*` — kept for future reuse if the
 * component is ever wired back in (desktop condensed view, header bar…).
 */
const GROUP_FALLBACK: Record<string, string> = {
  config: 'Configuration',
  network: 'Network',
  access: 'Access Control',
  cluster: 'Cluster',
  custom: 'Custom Resources',
  storage: 'Storage',
};

export function SubNav({ section: _section }: { section: SectionId }): null {
  // The component currently renders nothing: Sidebar owns the kind submenu,
  // and App.tsx no longer mounts SubNav for resource sections.
  void _section;
  void GROUP_FALLBACK;
  return null;
}