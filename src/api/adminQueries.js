// Admin paneli React Query hook'ları
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminService, announcementService } from './services'
import { useApiMutation } from './queries'
import { useApp } from '../context/AppContext'

export const aqk = {
  overview: ['admin', 'overview'],
  users: (q) => ['admin', 'users', q],
  user: (id) => ['admin', 'user', id],
  platform: ['admin', 'platform'],
  providers: ['admin', 'providers'],
  plans: ['admin', 'plans'],
  payments: (q) => ['admin', 'payments', q],
  announcements: ['admin', 'announcements'],
  audit: (q) => ['admin', 'audit', q],
  team: ['admin', 'team'],
}

/** İzin kontrolü: const can = useCan(); can('users.manage') */
export function useCan() {
  const { user } = useApp()
  return (perm) => !!user?.permissions?.includes(perm)
}

export const useAdminOverview = () => useQuery({ queryKey: aqk.overview, queryFn: adminService.overview, refetchInterval: 15_000 })
export const useAdminUsers = (q) => useQuery({ queryKey: aqk.users(q), queryFn: () => adminService.users(q), placeholderData: keepPreviousData })
export const useAdminUser = (id) => useQuery({ queryKey: aqk.user(id), queryFn: () => adminService.user(id), enabled: !!id })
export const usePlatform = () => useQuery({ queryKey: aqk.platform, queryFn: adminService.platform, refetchInterval: 10_000 })
export const useProviderHealth = () => useQuery({ queryKey: aqk.providers, queryFn: adminService.providers, refetchInterval: 5_000 })
export const useAdminPlans = () => useQuery({ queryKey: aqk.plans, queryFn: adminService.plans })
export const useAdminPayments = (q) => useQuery({ queryKey: aqk.payments(q), queryFn: () => adminService.payments(q), placeholderData: keepPreviousData })
export const useAdminAnnouncements = () => useQuery({ queryKey: aqk.announcements, queryFn: adminService.announcements })
export const useAudit = (q) => useQuery({ queryKey: aqk.audit(q), queryFn: () => adminService.audit(q), placeholderData: keepPreviousData })
export const useTeam = () => useQuery({ queryKey: aqk.team, queryFn: adminService.team })

/** Kullanıcı paneli banner'ları */
export const useActiveAnnouncements = () => useQuery({ queryKey: ['announcements', 'active'], queryFn: announcementService.active, refetchInterval: 15_000 })

const ADMIN = ['admin']
export const useUpdateUser = (opts) => useApiMutation(({ id, ...patch }) => adminService.updateUser(id, patch), { invalidate: [ADMIN], ...opts })
export const useUserAction = () =>
  useApiMutation(({ id, action, ...rest }) => ({ logoutAll: () => adminService.logoutAll(id), reset2fa: () => adminService.reset2fa(id, rest.reason), resend: () => adminService.resendVerification(id), note: () => adminService.addNote(id, rest.text) })[action](), {
    invalidate: [ADMIN],
    success: (_, v) => ({ logoutAll: 'Tüm oturumlar sonlandırıldı', reset2fa: '2FA sıfırlandı', resend: 'Doğrulama e-postası gönderildi', note: 'Not eklendi' })[v.action],
  })
export const useUpdatePlatform = () => useApiMutation(adminService.updatePlatform, { invalidate: [ADMIN], success: 'Platform ayarları kaydedildi' })
export const usePlatformKill = () => useApiMutation(({ active, reason }) => adminService.platformKill(active, reason), { invalidate: [ADMIN, ['announcements']] })
export const useUpdateProvider = () => useApiMutation(({ id, ...patch }) => adminService.updateProvider(id, patch), { invalidate: [ADMIN] })
export const useSavePlan = (opts) => useApiMutation(adminService.savePlan, { invalidate: [ADMIN], success: (d) => `${d.name} planı kaydedildi`, ...opts })
export const useDeletePlan = () => useApiMutation(adminService.deletePlan, { invalidate: [ADMIN], success: 'Plan silindi' })
export const useRefund = (opts) => useApiMutation(({ id, reason }) => adminService.refund(id, reason), { invalidate: [ADMIN], success: 'İade yapıldı', ...opts })
export const useConfirmPayment = () => useApiMutation(adminService.confirmPayment, { invalidate: [ADMIN], success: 'Ödeme onaylandı, plan aktifleşti' })
export const useFailPayment = (opts) => useApiMutation(({ id, reason }) => adminService.failPayment(id, reason), { invalidate: [ADMIN], success: 'Ödeme reddedildi', ...opts })
export const useSaveAnnouncement = (opts) => useApiMutation(adminService.saveAnnouncement, { invalidate: [ADMIN, ['announcements']], success: 'Duyuru kaydedildi', ...opts })
export const useDeleteAnnouncement = () => useApiMutation(adminService.deleteAnnouncement, { invalidate: [ADMIN, ['announcements']], success: 'Duyuru silindi' })
export const useInviteAdmin = (opts) => useApiMutation(adminService.invite, { invalidate: [ADMIN], success: (d) => `${d.name} davet edildi`, ...opts })
export const useUpdateAdmin = () => useApiMutation(({ id, ...patch }) => adminService.updateAdmin(id, patch), { invalidate: [ADMIN], success: 'Admin güncellendi' })
export const useRemoveAdmin = () => useApiMutation(adminService.removeAdmin, { invalidate: [ADMIN], success: 'Ekipten çıkarıldı' })
