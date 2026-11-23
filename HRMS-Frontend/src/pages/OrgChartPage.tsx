import React, { useState, useEffect, useRef, useCallback } from 'react';
import { organizationApi, userApi } from '../services/api.service';
import { PageHeader, Card, Button } from '../components/common';
import {
  Users, Building, Mail, Phone, ChevronDown, ChevronRight, Search,
  ZoomIn, ZoomOut, RefreshCw, UserCheck, Download, Minimize2,
  Sparkles, CheckCircle2, Shield, Calendar, MapPin, ExternalLink,
  X, Briefcase, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandLoader } from '../components/common/HariHrmsLogo';

interface OrgNode {
  id: string;
  name: string;
  empId: string;
  position: string;
  department: string;
  email: string;
  mobile?: string;
  profileImage?: string;
  location?: string;
  roleName?: string;
  isSystem?: boolean;
  children: OrgNode[];
}

export default function OrgChartPage() {
  const [tree, setTree] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [scopedDept, setScopedDept] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [groupByDept, setGroupByDept] = useState(false);
  const [activeGoTo, setActiveGoTo] = useState<'top' | 'dept' | 'me'>('top');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<OrgNode | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const currentUserId = localStorage.getItem('userId') || '';
  const currentUserName = (localStorage.getItem('user_name') || '').toLowerCase();
  const currentUserDept = localStorage.getItem('department') || '';

  useEffect(() => {
    loadTree(selectedDeptFilter);
    loadDepartments();
  }, [selectedDeptFilter]);

  const loadDepartments = async () => {
    try {
      const res = await organizationApi.getDepartments();
      if (Array.isArray(res.data)) {
        setDepartments(res.data);
      }
    } catch {
      // ignore
    }
  };

  const loadTree = async (deptFilter = 'All') => {
    setLoading(true);
    try {
      const params = deptFilter && deptFilter !== 'All' ? { department: deptFilter } : undefined;
      const res = await organizationApi.getTree(params);
      const data = res.data;
      if (data && data.tree) {
        setTree(Array.isArray(data.tree) ? data.tree : [data.tree]);
        setIsSuperAdmin(!!data.isSuperAdmin);
        setScopedDept(data.scopedDepartment || 'My Department');
      } else if (Array.isArray(data)) {
        setTree(data);
      }
    } catch {
      toast.error('Failed to load organization hierarchy');
    } finally {
      setLoading(false);
    }
  };

  // Helper to find node path from root
  const findPathToNode = (nodes: OrgNode[], predicate: (n: OrgNode) => boolean, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      if (predicate(node)) {
        return [...path, node.id];
      }
      if (node.children && node.children.length > 0) {
        const found = findPathToNode(node.children, predicate, [...path, node.id]);
        if (found) return found;
      }
    }
    return null;
  };

  const scrollToNode = (nodeId: string) => {
    setTimeout(() => {
      const el = document.getElementById(`keka-node-${nodeId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }, 150);
  };

  // Go to: Top of the Org
  const handleGoToTop = () => {
    setActiveGoTo('top');
    setHighlightedId(null);
    if (selectedDeptFilter !== 'All') {
      setSelectedDeptFilter('All');
    } else {
      if (tree.length > 0) {
        scrollToNode(tree[0].id);
      }
    }
    toast.success('Centered at Top of Organization');
  };

  // Go to: My Department
  const handleGoToDept = () => {
    setActiveGoTo('dept');
    const myDept = currentUserDept || 'Engineering';
    if (isSuperAdmin) {
      setSelectedDeptFilter(myDept);
    }
    toast.success(`Showing ${myDept} Department Tree`);
  };

  // Go to: Me (Employee's own card)
  const handleGoToMe = () => {
    setActiveGoTo('me');
    const predicate = (n: OrgNode): boolean =>
      n.id === currentUserId ||
      Boolean(currentUserName && n.name.toLowerCase().includes(currentUserName));

    const path = findPathToNode(tree, predicate);
    if (path && path.length > 0) {
      const targetId = path[path.length - 1];
      // Expand all ancestors
      setCollapsedNodes(prev => {
        const next = { ...prev };
        path.forEach(id => {
          next[id] = false;
        });
        return next;
      });
      setHighlightedId(targetId);
      scrollToNode(targetId);
      toast.success('Focused on your profile node in the tree');
    } else {
      toast('Your profile node is not in this department view', { icon: 'ℹ️' });
    }
  };

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = () => {
    window.print();
  };

  const handleResetZoom = () => {
    setZoom(1);
    if (tree.length > 0) {
      scrollToNode(tree[0].id);
    }
  };

  // Render a Single Employee Card in our local design system
  const renderEmployeeCard = (node: OrgNode) => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isMe = node.id === currentUserId || (currentUserName && node.name.toLowerCase() === currentUserName);
    const isHighlighted = highlightedId === node.id;
    const isMatch = search.trim() && (
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.position.toLowerCase().includes(search.toLowerCase()) ||
      node.department.toLowerCase().includes(search.toLowerCase())
    );

    const locationText = node.location || 'KIC Bengaluru';

    return (
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          id={`org-node-${node.id}`}
          onClick={() => setSelectedEmployee(node)}
          style={{
            width: '270px',
            minHeight: '86px',
            background: 'var(--surface-card, rgba(255, 255, 255, 0.85))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: isHighlighted
              ? '2px solid #567C8D'
              : isMatch
              ? '2px solid #22c55e'
              : node.isSystem
              ? '2px solid #2F4156'
              : '1.5px solid rgba(86, 124, 141, 0.22)',
            boxShadow: isHighlighted
              ? '0 0 0 4px rgba(86, 124, 141, 0.25), 0 12px 28px -4px rgba(47, 65, 86, 0.2)'
              : '0 6px 20px rgba(47, 65, 86, 0.06)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            zIndex: 3,
            animation: isHighlighted ? 'pulse 2s infinite' : 'none',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(47, 65, 86, 0.12)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = isHighlighted
              ? '0 0 0 4px rgba(86, 124, 141, 0.25), 0 12px 28px -4px rgba(47, 65, 86, 0.2)'
              : '0 6px 20px rgba(47, 65, 86, 0.06)';
          }}
        >
          {/* Avatar with our local brand gradient */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.94rem',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 3px 8px rgba(47, 65, 86, 0.18)',
            }}
          >
            {node.profileImage ? (
              <img src={node.profileImage} alt={node.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              node.name.slice(0, 2).toUpperCase()
            )}
          </div>

          {/* Employee Text Info */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
                title={node.name}
              >
                {node.name}
              </span>
              {isMe && (
                <span style={{ fontSize: '0.62rem', background: '#567C8D', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  YOU
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: '0.82rem',
                color: '#567C8D',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
              title={node.position}
            >
              {node.position}
            </span>

            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {locationText} • {node.department}
            </span>
          </div>

          {/* Circular Expand/Collapse Toggle Button */}
          {hasChildren && (
            <button
              onClick={e => toggleCollapse(node.id, e)}
              style={{
                position: 'absolute',
                bottom: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2F4156 0%, #567C8D 100%)',
                border: '2px solid var(--surface-0)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(47, 65, 86, 0.35)',
                fontSize: '0.8rem',
                fontWeight: 800,
                zIndex: 4,
                transition: 'transform 0.18s ease',
              }}
              title={isCollapsed ? `Expand ${node.children.length} direct reports` : 'Collapse direct reports'}
              onMouseOver={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(1.15)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
            >
              {isCollapsed ? '+' : '−'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Branch (Node + Sub-tree)
  const renderBranch = (node: OrgNode, level = 0): React.ReactNode => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {renderEmployeeCard(node)}

        {/* Child Sub-Branches */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '12px' }}>
            {/* Vertical stem from parent circular button */}
            <div style={{ width: '2px', height: '28px', background: 'rgba(86, 124, 141, 0.35)' }} />

            {/* If node has multiple children: horizontal runner line connecting all children */}
            {node.children.length > 1 ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'relative',
                  gap: '2.5rem',
                }}
              >
                {/* Continuous Horizontal Rail connecting first child center to last child center */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '135px',
                    right: '135px',
                    height: '2px',
                    background: 'rgba(86, 124, 141, 0.35)',
                  }}
                />

                {node.children.map((child) => (
                  <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Vertical drop from horizontal rail into child card */}
                    <div style={{ width: '2px', height: '24px', background: 'rgba(86, 124, 141, 0.35)' }} />
                    {renderBranch(child, level + 1)}
                  </div>
                ))}
              </div>
            ) : (
              /* Single child: straight vertical connection */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '2px', height: '24px', background: 'rgba(86, 124, 141, 0.35)' }} />
                {renderBranch(node.children[0], level + 1)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Local PageHeader */}
      <PageHeader
        title="Organization Hierarchy"
        subtitle="Explore company reporting structure, leadership, and departmental teams"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExport}
            >
              Export Chart
            </Button>
          </div>
        }
      />

      {/* Local Search & Control Card */}
      <Card className="search-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Left: Department Selector & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            {isSuperAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={16} color="#567C8D" />
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-sm, 10px)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-0)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="All">All Departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id || d.name} value={d.name}>{d.name} Department</option>
                  ))}
                </select>
              </div>
            )}

            <div className="search-input-wrap" style={{ minWidth: '220px', maxWidth: '320px', flex: 1 }}>
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search employee / role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Quick Jump Actions & Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Focus:</span>
            <Button
              variant={activeGoTo === 'top' ? 'primary' : 'outline'}
              size="sm"
              icon={<Award size={14} />}
              onClick={handleGoToTop}
            >
              Top of Org
            </Button>
            <Button
              variant={activeGoTo === 'dept' ? 'primary' : 'outline'}
              size="sm"
              icon={<Building size={14} />}
              onClick={handleGoToDept}
            >
              My Department
            </Button>
            <Button
              variant={activeGoTo === 'me' ? 'primary' : 'outline'}
              size="sm"
              icon={<UserCheck size={14} />}
              onClick={handleGoToMe}
            >
              My Profile
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '0.5rem' }}>
              <div
                onClick={() => setGroupByDept(!groupByDept)}
                style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '22px',
                  background: groupByDept ? '#567C8D' : 'var(--surface-2, #cbd5e1)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transform: groupByDept ? 'translateX(16px)' : 'translateX(0)',
                    transition: 'transform 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Group
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Local Tree Canvas Card */}
      <Card
        style={{
          position: 'relative',
          overflow: 'auto',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minHeight: '680px',
          padding: '3.5rem 1.5rem 5rem 1.5rem',
        }}
      >
        <div ref={canvasRef} style={{ width: '100%', height: '100%' }}>
          {/* Floating Zoom Controls using our brand glass dock */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              background: 'var(--surface-0)',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 16px rgba(47, 65, 86, 0.08)',
              padding: '4px',
            }}
          >
            <button
              onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
              title="Zoom In"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.12)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
              title="Zoom Out"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.12)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.12)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Minimize2 size={15} />
            </button>
          </div>

          {/* Tree Hierarchy */}
          {loading ? (
            <BrandLoader size={50} message="Rendering organization hierarchy..." fullPage={false} />
          ) : tree.length === 0 ? (
            <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Users size={56} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600 }}>No reporting relationships found in this view.</p>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                display: 'flex',
                justifyContent: 'center',
                minWidth: 'max-content',
                paddingBottom: '3rem',
              }}
            >
              {tree.map(rootNode => renderBranch(rootNode))}
            </div>
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════
          EMPLOYEE QUICK DETAIL SLIDEOUT DRAWER
          ══════════════════════════════════════════════════════ */}
      {selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(380px, 100vw)',
            background: 'var(--surface-0)',
            borderLeft: '1px solid rgba(86, 124, 141, 0.25)',
            boxShadow: '-8px 0 32px rgba(47, 65, 86, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Drawer Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(86, 124, 141, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Employee Profile</h3>
            <button
              onClick={() => setSelectedEmployee(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Body */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Profile Avatar & Name */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2F4156, #567C8D)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 14px rgba(47, 65, 86, 0.2)',
                }}
              >
                {selectedEmployee.profileImage ? (
                  <img src={selectedEmployee.profileImage} alt={selectedEmployee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  selectedEmployee.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedEmployee.name}</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#567C8D', fontWeight: 600 }}>{selectedEmployee.position}</p>
              <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.72rem', background: 'rgba(86, 124, 141, 0.15)', color: '#2F4156', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                {selectedEmployee.empId}
              </span>
            </div>

            {/* Quick Details List */}
            <div style={{ background: 'rgba(86, 124, 141, 0.06)', borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Building size={16} color="#567C8D" />
                <span style={{ color: 'var(--text-secondary)' }}>Department:</span>
                <strong style={{ marginLeft: 'auto', color: 'var(--text-primary)' }}>{selectedEmployee.department}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <MapPin size={16} color="#567C8D" />
                <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
                <strong style={{ marginLeft: 'auto', color: 'var(--text-primary)' }}>{selectedEmployee.location || 'KIC Bengaluru'}</strong>
              </div>
              {selectedEmployee.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                  <Mail size={16} color="#567C8D" />
                  <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                  <a href={`mailto:${selectedEmployee.email}`} style={{ marginLeft: 'auto', color: '#567C8D', fontWeight: 600, textDecoration: 'none', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedEmployee.email}
                  </a>
                </div>
              )}
              {selectedEmployee.mobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                  <Phone size={16} color="#567C8D" />
                  <span style={{ color: 'var(--text-secondary)' }}>Mobile:</span>
                  <a href={`tel:${selectedEmployee.mobile}`} style={{ marginLeft: 'auto', color: '#567C8D', fontWeight: 600, textDecoration: 'none' }}>
                    {selectedEmployee.mobile}
                  </a>
                </div>
              )}
            </div>

            {/* Direct Reports Count */}
            <div style={{ borderTop: '1px solid rgba(86, 124, 141, 0.15)', paddingTop: '1rem' }}>
              <h5 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Direct Reports ({selectedEmployee.children?.length || 0})
              </h5>
              {selectedEmployee.children && selectedEmployee.children.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedEmployee.children.map(child => (
                    <div
                      key={child.id}
                      onClick={() => {
                        setSelectedEmployee(child);
                        scrollToNode(child.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(86, 124, 141, 0.08)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.16)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(86, 124, 141, 0.08)')}
                    >
                      <UserCheck size={14} color="#567C8D" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{child.name}</span>
                      <small style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#567C8D' }}>{child.position}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Individual Contributor (no direct reports)</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
