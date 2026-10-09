import React, { useState, useEffect, useCallback } from 'react';
import { NetworkSettingsApi } from '../api/networkSettingsApi';
import { RefreshCw, Plus, Pencil, Trash2, X, Wifi, Shield, AlertCircle } from 'lucide-react';
import { useDialog } from '../context/DialogContext';
import { PermissionGuard } from '../components/PermissionGuard';

/* ── Palette ── */
const C = {
  card: '#EEF1F0', border: 'rgba(0,80,60,0.09)',
  shadow: '0 2px 12px rgba(0,60,45,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  primary: '#0F766E', primaryHov: '#14B8A6',
  textMain: '#1A2E2B', textSub: '#1E4A42', textMuted: '#2E6058',
  headerBg: 'linear-gradient(135deg, #0c1e1c 0%, #1e3a37 100%)',
};

const fieldStyle = { 
  width:'100%', padding:'9px 13px', borderRadius:8, border:`1px solid ${C.border}`, 
  background:C.card, fontSize:'0.82rem', color:C.textMain, outline:'none', 
  fontFamily:'Poppins,sans-serif', boxSizing:'border-box', transition:'border 0.2s' 
};

const labelStyle = { 
  display:'block', fontSize:'0.72rem', fontWeight:600, color:C.textSub, 
  marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' 
};

const GreenBtn = ({ children, onClick, disabled, style={} }) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    style={{ 
      background:disabled?'#8AADA6':C.primary, 
      color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', 
      fontSize:'0.78rem', fontWeight:600, cursor:disabled?'not-allowed':'pointer', 
      display:'inline-flex', alignItems:'center', gap:7, fontFamily:'Poppins,sans-serif', 
      transition:'background 0.15s', ...style 
    }}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=C.primaryHov;}}
    onMouseLeave={e=>{if(!disabled)e.currentTarget.style.background=C.primary;}}
  >
    {children}
  </button>
);

const Notice = ({ type, message, onClose }) => message ? (
  <div style={{ 
    padding:'11px 16px', borderRadius:10, marginBottom:16, 
    background:type==='error'?'rgba(220,38,38,0.08)':'rgba(15,118,110,0.1)', 
    border:`1px solid ${type==='error'?'rgba(220,38,38,0.2)':'rgba(15,118,110,0.2)'}`, 
    color:type==='error'?'#DC2626':C.primary, fontSize:'0.8rem', fontWeight:500, 
    display:'flex', justifyContent:'space-between', alignItems:'center', 
    fontFamily:'Poppins,sans-serif' 
  }}>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <AlertCircle size={16}/>
      <span>{message}</span>
    </div>
    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', display:'flex' }}>
      <X size={15}/>
    </button>
  </div>
) : null;

/* ── Create/Edit Modal ── */
const NetworkSettingModal = ({ setting, onClose, onSaved, showMsg }) => {
  const [label, setLabel] = useState(setting?.label || '');
  const [ipRange, setIpRange] = useState(setting?.ip_range || '');
  const [isActive, setIsActive] = useState(setting?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!label.trim()) {
      showMsg('error', 'Label is required.');
      return;
    }
    
    if (!ipRange.trim()) {
      showMsg('error', 'IP range is required.');
      return;
    }

    // Basic IP/CIDR validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipPattern.test(ipRange.trim())) {
      showMsg('error', 'Invalid IP address or CIDR notation. Example: 192.168.1.100 or 192.168.1.0/24');
      return;
    }

    setSaving(true);
    try {
      const body = {
        label: label.trim(),
        ip_range: ipRange.trim(),
        is_active: isActive ? 1 : 0,
      };

      if (setting) {
        await NetworkSettingsApi.update(setting.uuid, body);
        showMsg('success', 'Network setting updated successfully.');
      } else {
        await NetworkSettingsApi.create(body);
        showMsg('success', 'Network setting created successfully.');
      }
      onSaved();
    } catch (err) {
      showMsg('error', err.message || 'Failed to save network setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ 
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', 
      display:'flex', alignItems:'center', justifyContent:'center', 
      zIndex:1000, padding:20 
    }}>
      <div style={{ 
        background:C.card, borderRadius:14, width:'100%', maxWidth:500, 
        padding:28, boxShadow:'0 25px 50px rgba(0,0,0,0.3)', 
        border:`1px solid ${C.border}` 
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:'1rem', fontWeight:700, color:C.textMain }}>
            {setting ? 'Edit Network Setting' : 'Add Network Setting'}
          </h2>
          <button 
            onClick={onClose} 
            style={{ background:'none', border:'none', cursor:'pointer', color:C.textMuted, display:'flex' }}
          >
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>Label *</label>
            <input 
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g., Main Office, Branch Office, VPN Range"
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
              maxLength={100}
            />
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={labelStyle}>IP Range *</label>
            <input 
              value={ipRange}
              onChange={e => setIpRange(e.target.value)}
              placeholder="e.g., 192.168.1.100 or 192.168.1.0/24"
              style={fieldStyle}
              onFocus={e => e.target.style.borderColor = C.primary}
              onBlur={e => e.target.style.borderColor = C.border}
              maxLength={50}
            />
            <p style={{ 
              margin:'5px 0 0', fontSize:'0.7rem', color:C.textMuted, 
              fontStyle:'italic' 
            }}>
              Supports single IPs (192.168.1.100) or CIDR ranges (192.168.1.0/24)
            </p>
          </div>

          <div style={{ marginBottom:22 }}>
            <label style={{ 
              display:'flex', alignItems:'center', gap:8, cursor:'pointer',
              fontSize:'0.82rem', fontWeight:600, color:C.textSub
            }}>
              <input 
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{ width:16, height:16, cursor:'pointer' }}
              />
              Active (Allow attendance from this IP range)
            </label>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                padding:'9px 18px', borderRadius:8, border:`1px solid ${C.border}`, 
                background:'transparent', color:C.textSub, fontWeight:600, 
                fontSize:'0.78rem', cursor:'pointer', fontFamily:'Poppins,sans-serif' 
              }}
            >
              Cancel
            </button>
            <GreenBtn type="submit" disabled={saving}>
              {saving ? 'Saving…' : (setting ? 'Update' : 'Create')}
            </GreenBtn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const NetworkSettingsPage = () => {
  const dialog = useDialog();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type:'', message:'' });
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState(null);
  const [deleting, setDeleting] = useState('');

  const showMsg = (type, message) => { 
    setNotice({ type, message }); 
    setTimeout(() => setNotice({ type:'', message:'' }), 4500); 
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await NetworkSettingsApi.list();
      setSettings(res?.data || []);
    } catch (e) {
      showMsg('error', e.message || 'Failed to load network settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (uuid) => {
    dialog.showDeleteConfirm(
      'Delete this network setting? Employees will no longer be able to punch from this IP range.',
      async () => {
        setDeleting(uuid);
        try {
          await NetworkSettingsApi.delete(uuid);
          showMsg('success', 'Network setting deleted.');
          load();
        } catch (e) {
          showMsg('error', e.message || 'Failed to delete.');
        } finally {
          setDeleting('');
        }
      },
      {
        title: 'Delete Network Setting',
        confirmText: 'Delete',
      }
    );
  };

  const handleEdit = (setting) => {
    setEditingSetting(setting);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingSetting(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingSetting(null);
  };

  const handleModalSaved = () => {
    setShowModal(false);
    setEditingSetting(null);
    load();
  };

  return (
    <div style={{ fontFamily:'Poppins,sans-serif', display:'flex', flexDirection:'column', gap:20 }}>
      <Notice type={notice.type} message={notice.message} onClose={() => setNotice({ type:'', message:'' })} />

      {/* Header */}
      <div style={{ 
        background:C.headerBg, borderRadius:14, padding:'20px 26px', 
        display:'flex', justifyContent:'space-between', alignItems:'center', 
        boxShadow:'0 4px 20px rgba(0,0,0,0.18)' 
      }}>
        <div>
          <h1 style={{ margin:0, fontSize:'1.2rem', fontWeight:700, color:'#E8F0EE' }}>
            Network Settings
          </h1>
          <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'rgba(232,240,238,0.6)' }}>
            Manage allowed IP addresses and ranges for employee self-punch
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button 
            onClick={load} 
            style={{ 
              background:'rgba(255,255,255,0.1)', color:'#E8F0EE', border:'1px solid rgba(232,240,238,0.3)', 
              borderRadius:8, padding:'10px 16px', fontSize:'0.82rem', fontWeight:600, 
              cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, 
              fontFamily:'Poppins,sans-serif', transition:'all 0.15s' 
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <RefreshCw size={16}/>
            Refresh
          </button>
          <button 
            onClick={handleCreate} 
            style={{ 
              background:'#E8F0EE', color:C.primary, border:'none', borderRadius:8, 
              padding:'10px 20px', fontSize:'0.82rem', fontWeight:600, cursor:'pointer', 
              display:'inline-flex', alignItems:'center', gap:8, fontFamily:'Poppins,sans-serif', 
              transition:'all 0.15s' 
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff'}
            onMouseLeave={e => e.currentTarget.style.background = '#E8F0EE'}
          >
            <Plus size={16}/>
            Add Network Setting
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ 
        background:'rgba(15,118,110,0.08)', borderRadius:14, 
        border:`1px solid ${C.border}`, padding:'16px 20px', 
        display:'flex', alignItems:'start', gap:12 
      }}>
        <Shield size={20} style={{ color:C.primary, marginTop:2, flexShrink:0 }}/>
        <div>
          <p style={{ margin:0, fontSize:'0.82rem', fontWeight:600, color:C.textMain, marginBottom:4 }}>
            Company Wi-Fi Verification
          </p>
          <p style={{ margin:0, fontSize:'0.76rem', color:C.textSub, lineHeight:1.5 }}>
            Employee self-punch feature requires users to be connected to one of the allowed IP addresses or ranges configured below. 
            This ensures attendance can only be recorded from company premises or approved remote locations.
          </p>
        </div>
      </div>

      {/* Settings List */}
      <div style={{ 
        background:C.card, borderRadius:14, border:`1px solid ${C.border}`, 
        boxShadow:C.shadow, overflow:'hidden' 
      }}>
        <div style={{ 
          padding:'14px 20px', borderBottom:`1px solid ${C.border}`, 
          display:'flex', alignItems:'center', justifyContent:'space-between' 
        }}>
          <span style={{ fontSize:'0.8rem', fontWeight:600, color:C.textSub }}>
            {settings.length} network {settings.length === 1 ? 'setting' : 'settings'} configured
          </span>
        </div>

        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:C.textMuted, fontSize:'0.85rem' }}>
            Loading network settings…
          </div>
        ) : settings.length === 0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <Wifi size={48} style={{ color:C.textMuted, opacity:0.3, margin:'0 auto 16px' }}/>
            <p style={{ margin:0, fontSize:'0.9rem', fontWeight:600, color:C.textMain, marginBottom:8 }}>
              No Network Settings Configured
            </p>
            <p style={{ margin:0, fontSize:'0.8rem', color:C.textMuted, marginBottom:20 }}>
              Add IP addresses or ranges to allow employee self-punch from specific networks.
            </p>
            <GreenBtn onClick={handleCreate}>
              <Plus size={16}/>
              Add First Network Setting
            </GreenBtn>
          </div>
        ) : (
          <div style={{ padding:20 }}>
            <div style={{ display:'grid', gap:12 }}>
              {settings.map((setting) => (
                <div 
                  key={setting.uuid}
                  style={{ 
                    background:'#fff', border:`1px solid ${C.border}`, 
                    borderRadius:10, padding:16, display:'flex', 
                    justifyContent:'space-between', alignItems:'center',
                    transition:'all 0.15s'
                  }}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                      <h3 style={{ 
                        margin:0, fontSize:'0.88rem', fontWeight:700, 
                        color:C.textMain 
                      }}>
                        {setting.label}
                      </h3>
                      <span style={{ 
                        padding:'3px 10px', borderRadius:99, fontSize:'0.68rem', 
                        fontWeight:700, 
                        background: setting.is_active ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)', 
                        color: setting.is_active ? '#059669' : '#DC2626' 
                      }}>
                        {setting.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div style={{ 
                      display:'flex', alignItems:'center', gap:8, 
                      fontSize:'0.78rem', color:C.textSub 
                    }}>
                      <Wifi size={14} style={{ color:C.textMuted }}/>
                      <code style={{ 
                        background:'rgba(0,80,60,0.05)', padding:'4px 10px', 
                        borderRadius:6, fontFamily:'monospace', fontSize:'0.76rem',
                        color:C.primary, fontWeight:600
                      }}>
                        {setting.ip_range}
                      </code>
                    </div>
                    {setting.created_at && (
                      <p style={{ 
                        margin:'6px 0 0', fontSize:'0.7rem', color:C.textMuted 
                      }}>
                        Created: {new Date(setting.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:6, marginLeft:16 }}>
                    <button 
                      onClick={() => handleEdit(setting)}
                      title="Edit"
                      style={{ 
                        background:'none', border:`1px solid ${C.border}`, 
                        cursor:'pointer', color:C.primary, padding:8, 
                        borderRadius:8, display:'flex', transition:'all 0.15s' 
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(15,118,110,0.1)';
                        e.currentTarget.style.borderColor = C.primary;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.borderColor = C.border;
                      }}
                    >
                      <Pencil size={16}/>
                    </button>
                    <button 
                      onClick={() => handleDelete(setting.uuid)}
                      disabled={deleting === setting.uuid}
                      title="Delete"
                      style={{ 
                        background:'none', border:`1px solid ${C.border}`, 
                        cursor:deleting === setting.uuid ? 'not-allowed' : 'pointer', 
                        color:'#DC2626', padding:8, borderRadius:8, display:'flex', 
                        opacity:deleting === setting.uuid ? 0.5 : 1,
                        transition:'all 0.15s' 
                      }}
                      onMouseEnter={e => {
                        if (deleting !== setting.uuid) {
                          e.currentTarget.style.background = 'rgba(220,38,38,0.1)';
                          e.currentTarget.style.borderColor = '#DC2626';
                        }
                      }}
                      onMouseLeave={e => {
                        if (deleting !== setting.uuid) {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.borderColor = C.border;
                        }
                      }}
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NetworkSettingModal 
          setting={editingSetting}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
          showMsg={showMsg}
        />
      )}
    </div>
  );
};

// Wrap with permission guard to enforce RBAC
const ProtectedNetworkSettingsPage = () => (
  <PermissionGuard permissions="NetworkSettings.View">
    <NetworkSettingsPage />
  </PermissionGuard>
);

export default ProtectedNetworkSettingsPage;
