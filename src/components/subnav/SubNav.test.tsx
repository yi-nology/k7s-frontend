/**
 * Tests for SubNav — the per-section kind tab strip (P1 IA rework).
 *
 * 历史:SubNav 原本在每个资源分区内容区顶部渲染 kind tab 列表(workloads
 * 平铺、config/storage 分组 + 末尾 CRD 组)。该职责已下沉到 Sidebar —
 * 当前激活的分区按钮会展开一个 kind 子菜单,App.tsx 不再挂载 SubNav。
 *
 * 本文件保留下来只为固化 "SubNav 现在返回 null" 的事实(避免有人误把它
 * 接回去当 SubNav 用,造成双层导航)。所有"渲染 tab / 切换 nav / CRD
 * 过滤"的断言都搬到了 Sidebar.test.tsx 的 kind submenu 用例里。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../store';
import { SubNav } from './SubNav';
import { cleanup, render, type RenderResult } from '../../test/componentUtils';

let view: RenderResult;

function resetStore() {
  useStore.setState({
    nav: 'pods',
    section: 'overview',
    customKinds: [],
    customKindCounts: undefined,
    settings: { ...useStore.getState().settings, language: 'en' },
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('SubNav (deprecated — kind navigation moved into Sidebar)', () => {
  it('renders nothing for the workloads section (Sidebar owns the kind submenu)', () => {
    useStore.setState({ nav: 'deployments', section: 'workloads' });
    view = render(<SubNav section="workloads" />);
    expect(view.container.firstChild).toBeNull();
    expect(view.queryAllByRole('tab').length).toBe(0);
  });

  it('renders nothing for the config section (Sidebar owns the kind submenu)', () => {
    useStore.setState({ nav: 'configmaps', section: 'config' });
    view = render(<SubNav section="config" />);
    expect(view.container.firstChild).toBeNull();
    expect(view.queryAllByRole('tab').length).toBe(0);
  });

  it('renders nothing for the storage section (Sidebar owns the kind submenu)', () => {
    useStore.setState({ nav: 'persistentvolumeclaims', section: 'storage' });
    view = render(<SubNav section="storage" />);
    expect(view.container.firstChild).toBeNull();
    expect(view.queryAllByRole('tab').length).toBe(0);
  });
});