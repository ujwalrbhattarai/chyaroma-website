import * as settingsRepository from '../repositories/settingsRepository.js'
import * as tableRepository from '../repositories/tableRepository.js'

const settingsError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode })

export function assertSettingsAccess(user) {
  if (!user || !['super_admin', 'branch_manager'].includes(user.role)) throw settingsError('Forbidden', 403)
}

function resolveBranchId(user, requestedBranchId) {
  return user.role === 'super_admin' ? requestedBranchId : user.branchId
}

export function createSettingsService({ repository = settingsRepository, tables = tableRepository } = {}) {
  return {
    async getSettings(user, requestedBranchId) {
      assertSettingsAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw settingsError('branchId is required', 400)
      return repository.findSettingsByBranch(branchId)
    },
    async updateSettings(user, requestedBranchId, payload) {
      assertSettingsAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw settingsError('branchId is required', 400)
      const taxRate = Number(payload.taxRate ?? 0)
      const cancellationWindowMinutes = Number(payload.cancellationWindowMinutes ?? 2)
      const lowStockThreshold = Number(payload.lowStockThreshold ?? 0)
      const receiptFooter = payload.receiptFooter?.trim() ?? ''
      const cafeName = payload.cafeName?.trim() ?? ''
      const logoUrl = payload.logoUrl?.trim() ?? ''
      if (!Number.isFinite(taxRate) || taxRate < 0) throw settingsError('taxRate must be a non-negative number')
      if (!Number.isInteger(cancellationWindowMinutes) || cancellationWindowMinutes < 1) throw settingsError('cancellationWindowMinutes must be a positive integer')
      if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) throw settingsError('lowStockThreshold must be a non-negative number')
      return repository.upsertSettings(branchId, { taxRate, cancellationWindowMinutes, lowStockThreshold, receiptFooter, cafeName, logoUrl })
    },
    async getPublicBranding({ branchId, tableToken } = {}) {
      // Resolve the branch from either an explicit branchId or a table QR token.
      let resolvedBranchId = branchId
      if (!resolvedBranchId && tableToken) {
        const table = await tables.findTableByToken(tableToken)
        if (table) resolvedBranchId = table.branchId
      }
      if (!resolvedBranchId) return { cafeName: '', logoUrl: '' }
      const settings = await repository.findSettingsByBranch(resolvedBranchId)
      return {
        cafeName: settings?.cafeName ?? '',
        logoUrl: settings?.logoUrl ?? '',
      }
    },
    async uploadLogo(user, requestedBranchId, dataUrl) {
      assertSettingsAccess(user)
      const branchId = resolveBranchId(user, requestedBranchId)
      if (!branchId) throw settingsError('branchId is required', 400)
      if (!dataUrl || typeof dataUrl !== 'string') throw settingsError('Logo image data is required')
      // Validate it's a base64 image data URL (png/jpeg/webp/gif/svg)
      if (!/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
        throw settingsError('Invalid logo image. Please upload a PNG, JPG, WebP, GIF, or SVG image.')
      }
      // Cap the size at ~2MB to avoid storing huge blobs in the DB.
      const base64Length = dataUrl.length - dataUrl.indexOf(',') - 1
      if (base64Length > 2 * 1024 * 1024) throw settingsError('Logo image is too large. Maximum size is 2MB.')
      const existing = await repository.findSettingsByBranch(branchId)
      return repository.upsertSettings(branchId, {
        taxRate: existing?.taxRate ?? 0,
        cancellationWindowMinutes: existing?.cancellationWindowMinutes ?? 2,
        lowStockThreshold: existing?.lowStockThreshold ?? 0,
        receiptFooter: existing?.receiptFooter ?? '',
        cafeName: existing?.cafeName ?? '',
        logoUrl: dataUrl,
      })
    },
  }
}

const service = createSettingsService()
export const getSettings = (...args) => service.getSettings(...args)
export const updateSettings = (...args) => service.updateSettings(...args)
export const getPublicBranding = (...args) => service.getPublicBranding(...args)
export const uploadLogo = (...args) => service.uploadLogo(...args)
