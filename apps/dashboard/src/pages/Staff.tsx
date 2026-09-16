/**
 * DenaNeya v2.0 - Staff Management & Granular RBAC
 * File: apps/dashboard/src/pages/Staff.tsx
 *
 * Implements:
 * - 4-Tier Roles: Owner, Admin, Manager, Viewer
 * - 10-Module Granular CRUD Permissions Matrix:
 *   1. overview, 2. invoices, 3. payment_links, 4. landing_builder,
 *   5. gateways, 6. devices, 7. staff, 8. billing, 9. affiliate, 10. settings
 * - Staff member invitation & permission updates
 */

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Check,
  X,
  Lock,
  Trash2,
  Edit2
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { StaffMember, StaffRole, ModuleName, ModulePermission } from '../types/dashboard';

const MODULES_LIST: { key: ModuleName; label: string }[] = [
  { key: 'overview', label: '1. Analytics Overview' },
  { key: 'invoices', label: '2. Invoices & Builder' },
  { key: 'payment_links', label: '3. Payment Links' },
  { key: 'landing_builder', label: '4. Landing Page Builder' },
  { key: 'gateways', label: '5. Payment Gateways' },
  { key: 'devices', label: '6. Android Devices & SMS' },
  { key: 'staff', label: '7. Staff & RBAC' },
  { key: 'billing', label: '8. Credits & Billing' },
  { key: 'affiliate', label: '9. Refer & Earn' },
  { key: 'settings', label: '10. Profile, API Keys & 2FA' }
];

export const Staff: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([
    {
      id: 'st_01',
      user_id: 'usr_01',
      brand_id: 'current-brand',
      name: 'Tanvir Hossain',
      email: 'tanvir@deshicourse.com',
      role: 'owner',
      permissions: MODULES_LIST.map((m) => ({
        module: m.key,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true
      })),
      status: 'active',
      created_at: '2026-01-10T10:00:00Z'
    },
    {
      id: 'st_02',
      user_id: 'usr_02',
      brand_id: 'current-brand',
      name: 'Shahriar Kabir',
      email: 'shahriar@deshicourse.com',
      role: 'admin',
      permissions: MODULES_LIST.map((m) => ({
        module: m.key,
        can_create: !['staff', 'billing'].includes(m.key),
        can_read: true,
        can_update: !['staff', 'billing'].includes(m.key),
        can_delete: !['staff', 'billing'].includes(m.key)
      })),
      status: 'active',
      created_at: '2026-02-15T12:30:00Z'
    },
    {
      id: 'st_03',
      user_id: 'usr_03',
      brand_id: 'current-brand',
      name: 'Amina Khatun',
      email: 'amina@deshicourse.com',
      role: 'manager',
      permissions: MODULES_LIST.map((m) => ({
        module: m.key,
        can_create: ['invoices', 'payment_links'].includes(m.key),
        can_read: ['overview', 'invoices', 'payment_links', 'devices', 'gateways'].includes(m.key),
        can_update: ['invoices', 'payment_links'].includes(m.key),
        can_delete: false
      })),
      status: 'active',
      created_at: '2026-03-01T09:15:00Z'
    }
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Invite Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('manager');
  const [customPerms, setCustomPerms] = useState<Record<string, Record<string, boolean>>>({});

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    // Seed default permissions for selected role
    const initialPerms: Record<string, Record<string, boolean>> = {};
    MODULES_LIST.forEach((m) => {
      if (newRole === 'admin') {
        initialPerms[m.key] = {
          can_create: !['staff', 'billing', 'settings'].includes(m.key),
          can_read: true,
          can_update: !['staff', 'billing', 'settings'].includes(m.key),
          can_delete: !['staff', 'billing', 'settings'].includes(m.key)
        };
      } else if (newRole === 'manager') {
        initialPerms[m.key] = {
          can_create: ['invoices', 'payment_links'].includes(m.key),
          can_read: ['overview', 'invoices', 'payment_links', 'devices', 'gateways'].includes(m.key),
          can_update: ['invoices', 'payment_links'].includes(m.key),
          can_delete: false
        };
      } else if (newRole === 'viewer') {
        initialPerms[m.key] = {
          can_create: false,
          can_read: ['overview', 'invoices'].includes(m.key),
          can_update: false,
          can_delete: false
        };
      } else {
        // Owner
        initialPerms[m.key] = { can_create: true, can_read: true, can_update: true, can_delete: true };
      }
    });
    setCustomPerms(initialPerms);
  };

  const handlePermToggle = (mod: string, action: string) => {
    setCustomPerms((prev) => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [action]: !prev[mod]?.[action]
      }
    }));
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPerms: ModulePermission[] = MODULES_LIST.map((m) => ({
      module: m.key,
      can_create: Boolean(customPerms[m.key]?.can_create),
      can_read: Boolean(customPerms[m.key]?.can_read),
      can_update: Boolean(customPerms[m.key]?.can_update),
      can_delete: Boolean(customPerms[m.key]?.can_delete)
    }));

    const newStaff: StaffMember = {
      id: `st_${Date.now().toString(36)}`,
      user_id: `usr_${Date.now().toString(36)}`,
      brand_id: 'current-brand',
      name,
      email,
      role,
      permissions: formattedPerms,
      status: 'invited',
      created_at: new Date().toISOString()
    };

    setStaffList([...staffList, newStaff]);
    setIsInviteModalOpen(false);
    setName('');
    setEmail('');
    setRole('manager');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Staff Management & Granular RBAC
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your team access across 4 hierarchical roles and 10 isolated modules
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            handleRoleChange('manager');
            setIsInviteModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Invite Team Member
        </Button>
      </div>

      {/* Staff Members List */}
      <Card title="Team Members" subtitle="Authorized staff members with access to this brand">
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Team Member</th>
                <th className="px-6 py-3">Role Hierarchy</th>
                <th className="px-6 py-3">Module Permissions Summary</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {staffList.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="font-bold text-slate-900">{member.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{member.email}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge
                      variant={
                        member.role === 'owner'
                          ? 'info'
                          : member.role === 'admin'
                          ? 'neutral'
                          : 'warning'
                      }
                    >
                      <span className="capitalize">{member.role}</span>
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    {member.role === 'owner' ? (
                      <span className="text-emerald-700 font-semibold">Unrestricted (All 10 Modules)</span>
                    ) : (
                      <span>
                        {member.permissions.filter((p) => p.can_read).length} of 10 Modules Accessible
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={member.status === 'active' ? 'success' : 'warning'}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                    {new Date(member.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {member.role !== 'owner' && (
                      <button
                        title="Remove Access"
                        onClick={() => setStaffList(staffList.filter((s) => s.id !== member.id))}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal with 10-Module RBAC Matrix */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Staff Member & Configure RBAC"
        subtitle="Specify team credentials and fine-tune CRUD permissions across all 10 modules"
        maxWidth="xl"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Shakib Al Hasan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="colleague@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Base Role Assignment
            </label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
            >
              <option value="admin">Admin (Operational read/write; restricted billing/secrets)</option>
              <option value="manager">Manager (Invoices & payment links; read-only devices/gateways)</option>
              <option value="viewer">Viewer (Strictly read-only overview & invoices)</option>
            </select>
          </div>

          {/* Granular 10-Module RBAC Matrix */}
          <div>
            <span className="block text-xs font-bold text-slate-900 mb-2">
              Granular Module Permissions Matrix:
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Module</th>
                    <th className="px-3 py-2 text-center">Create</th>
                    <th className="px-3 py-2 text-center">Read</th>
                    <th className="px-3 py-2 text-center">Update</th>
                    <th className="px-3 py-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES_LIST.map((mod) => (
                    <tr key={mod.key} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-medium text-slate-800">{mod.label}</td>
                      {['can_create', 'can_read', 'can_update', 'can_delete'].map((action) => (
                        <td key={action} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(customPerms[mod.key]?.[action])}
                            onChange={() => handlePermToggle(mod.key, action)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Staff;
