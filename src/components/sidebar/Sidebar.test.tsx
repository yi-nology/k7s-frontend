/**
 * Tests for Sidebar — 5 分区可展开导航(把 kind 子菜单从 SubNav 下沉到这里)。
 *
 * 结构:
 *  - 5 个分区按钮(概览 / 工作负载 / 配置与网络 / 存储 / 运维工具)
 *  - 当前激活的分区(== store.section)会展开一个 kind 子菜单,点击子项走 setNav
 *  - 资源分区(三个)才有子菜单;非激活分区的子菜单不渲染
 *
 * 旧 SubNav 的"workloads 平铺 7 个 / config 分组 + CRD / storage 单组"语义
 * 都迁移到这里 —— Sidebar 是 kind 导航的唯一载体。
 *
 * 语言约定:resetStore 把 language 钉死成 zh(与 Sidebar 一致),子菜单 label
 * 断言也使用 zh 翻译。`kindLabelFor` 在缺 zh 翻译时回退到 EN_KIND_META.label
 * (如 deployments = "Deployments"),所以断言里看到的 label 是混合的。
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '../../store';
import { Sidebar } from './Sidebar';
import { render, cleanup, type RenderResult } from '../../test/componentUtils';

let view: RenderResult;

const CUSTOM_KINDS_MULTI = [
  {
    id: 'argoproj.io/applications',
    group: 'argoproj.io',
    version: 'v1alpha1',
    kind: 'Application',
    plural: 'applications',
    namespaced: true,
  },
  {
    id: 'argoproj.io/appprojects',
    group: 'argoproj.io',
    version: 'v1alpha1',
    kind: 'AppProject',
    plural: 'appprojects',
    namespaced: true,
  },
  {
    id: 'cert-manager.io/clusterissuers',
    group: 'cert-manager.io',
    version: 'v1',
    kind: 'ClusterIssuer',
    plural: 'clusterissuers',
    namespaced: false,
  },
];

function resetStore() {
  useStore.setState({
    nav: 'pods',
    section: 'overview',
    namespace: 'all',
    connection: { phase: 'idle', context: null, clusterName: null },
    watchCount: 0,
    rows: useStore.getState().rows,
    customKinds: [],
    customKindCounts: undefined,
    watchStatus: {},
    overlay: null,
    settings: { ...useStore.getState().settings, language: 'zh' },
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('Sidebar (5-section rail + kind submenu)', () => {
  it('renders exactly the 5 sections', () => {
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    for (const label of ['概览', '工作负载', '配置与网络', '存储', '运维工具']) {
      expect(view.querySelector(`[title="${label}"]`)).not.toBeNull();
    }
    expect(view.querySelectorAll('button[class*="railItem"]').length).toBe(5);
  });

  it('marks the active section', () => {
    useStore.setState({ section: 'workloads' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    const active = view.querySelector('[title="工作负载"]');
    expect(active).not.toBeNull();
    expect((active as HTMLElement).className).toContain('active');
    expect(view.querySelector('[title="概览"]')?.className).not.toContain('active');
  });

  it('labels the nav landmark with the localized aria-label', () => {
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    const nav = view.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute('aria-label')).toBe('主导航');
  });

  // ---- kind submenu ----

  it('shows the workloads kind submenu (flat list of 7) when workloads is active', () => {
    useStore.setState({ nav: 'deployments', section: 'workloads' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    // zh 翻译里 workload kind 是单数(中文语法):Deployment / StatefulSet /
    // DaemonSet / Job / CronJob / Pod / 发布。
    const tabs = view.queryAllByRole('tab');
    expect(tabs.length).toBe(7);
    expect(view.queryByRole('tab', { name: 'Deployment' })).not.toBeNull();
    expect(view.queryAllByRole('tab')[0]?.className).toContain('submenuItemActive');
    // Inactive siblings don't carry the active state.
    expect(
      view.queryByRole('tab', { name: 'Pod' })?.className
    ).not.toContain('submenuItemActive');
  });

  it('switches the nav kind (and re-derives the section) when a submenu item is clicked', () => {
    useStore.setState({ nav: 'deployments', section: 'workloads' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    view.click(view.getByText('Pod'));
    expect(useStore.getState().nav).toBe('pods');
    expect(useStore.getState().section).toBe('workloads');
  });

  it('renders config kinds (sidebar drops the headings in the submenu for space)', () => {
    useStore.setState({ nav: 'configmaps', section: 'config' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    // Sidebar 故意不带分组标题(顶部空间紧张);所有 config kind 都作为 tab 露出。
    // zh 翻译:NODES → 节点、INGRESSES → Ingress、CONFIGMAPS → ConfigMap。
    expect(view.queryByRole('tab', { name: '节点' })).not.toBeNull();
    expect(view.queryByRole('tab', { name: 'Ingress' })).not.toBeNull();
    expect(view.queryByRole('tab', { name: 'ConfigMap' })).not.toBeNull();
    // 没有 CRD 时不出现「Custom Resources」标题。
    expect(view.queryByText('Custom Resources')).toBeNull();
  });

  it('renders the storage section kinds as a flat submenu', () => {
    useStore.setState({ nav: 'persistentvolumeclaims', section: 'storage' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    const pvc = view.queryByRole('tab', { name: 'PersistentVolumeClaim' });
    expect(pvc).not.toBeNull();
    expect(pvc?.className).toContain('submenuItemActive');
    expect(view.queryByRole('tab', { name: 'PersistentVolume' })).not.toBeNull();
    expect(view.queryByRole('tab', { name: 'StorageClass' })).not.toBeNull();
  });

  it('localizes submenu labels in zh (nodes → 节点)', () => {
    useStore.setState({
      nav: 'nodes',
      section: 'config',
      settings: { ...useStore.getState().settings, language: 'zh' },
    });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    const node = view.queryByRole('tab', { name: '节点' });
    expect(node).not.toBeNull();
    expect(node?.className).toContain('submenuItemActive');
  });

  it('does not render a submenu for non-active resource sections', () => {
    useStore.setState({ nav: 'pods', section: 'workloads' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    // config 分区收起 → 它的 kind 不渲染为 tab
    expect(view.queryByRole('tab', { name: 'ConfigMap' })).toBeNull();
    expect(view.queryByRole('tab', { name: '节点' })).toBeNull();
    // workloads 分区激活 → 它的 kind 可见
    expect(view.queryByRole('tab', { name: 'Pod' })).not.toBeNull();
  });

  it('does not render a submenu for overview or tools (they have no kinds)', () => {
    useStore.setState({ section: 'overview' });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(view.queryAllByRole('tab').length).toBe(0);

    useStore.setState({ section: 'tools' });
    cleanup();
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(view.queryAllByRole('tab').length).toBe(0);
  });

  it('appends discovered CRD kinds to the config submenu', () => {
    useStore.setState({
      nav: 'configmaps',
      section: 'config',
      customKinds: [CUSTOM_KINDS_MULTI[0]],
      customKindCounts: { 'argoproj.io/applications': 5 },
    });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    // CRD label 走 ck.kind(CRD 自己的 PascalCase 名),不是 EN_KIND_META。
    expect(view.queryByRole('tab', { name: 'Application' })).not.toBeNull();
  });

  it('hides CRD kinds with 0 instances when counts are loaded', () => {
    useStore.setState({
      nav: 'configmaps',
      section: 'config',
      customKinds: CUSTOM_KINDS_MULTI,
      customKindCounts: {
        'argoproj.io/applications': 5,
        'argoproj.io/appprojects': 0,
        'cert-manager.io/clusterissuers': 0,
      },
    });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    // 可见:非零 Application
    expect(view.queryByRole('tab', { name: 'Application' })).not.toBeNull();
    // 隐藏:零计数 AppProject + ClusterIssuer
    expect(view.queryByRole('tab', { name: 'AppProject' })).toBeNull();
    expect(view.queryByRole('tab', { name: 'ClusterIssuer' })).toBeNull();
  });

  it('never hides the active CRD kind even when its count is 0', () => {
    useStore.setState({
      nav: 'argoproj.io/appprojects',
      section: 'config',
      customKinds: CUSTOM_KINDS_MULTI,
      customKindCounts: {
        'argoproj.io/applications': 5,
        'argoproj.io/appprojects': 0,
        'cert-manager.io/clusterissuers': 0,
      },
    });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    const appProject = view.queryByRole('tab', { name: 'AppProject' });
    expect(appProject).not.toBeNull();
    expect(appProject?.className).toContain('submenuItemActive');
  });

  it('shows all CRD kinds when counts are not loaded yet', () => {
    useStore.setState({
      nav: 'configmaps',
      section: 'config',
      customKinds: CUSTOM_KINDS_MULTI,
      customKindCounts: undefined,
    });
    view = render(<Sidebar open onClose={() => {}} onToggle={() => {}} />);
    expect(view.queryByRole('tab', { name: 'Application' })).not.toBeNull();
    expect(view.queryByRole('tab', { name: 'AppProject' })).not.toBeNull();
    expect(view.queryByRole('tab', { name: 'ClusterIssuer' })).not.toBeNull();
  });
});