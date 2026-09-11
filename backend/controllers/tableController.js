import { createTable, deactivateTable, forceReleaseTable, generateQrCode, listTables, releaseTable, setTableOccupied, validateScanToken } from '../services/tableService.js'

export async function validateTableTokenHandler(request, response, next) {
  try { response.status(200).json(await validateScanToken(request.body.token)) } catch (error) { next(error) }
}

export async function releaseTableHandler(request, response, next) {
  try { response.status(200).json(await releaseTable(request.body.token)) } catch (error) { next(error) }
}

export async function getTablesHandler(request, response, next) {
  try {
    response.status(200).json({ tables: await listTables(request.user, request.query.branchId) })
  } catch (error) { next(error) }
}

export async function createTableHandler(request, response, next) {
  try {
    const table = await createTable(request.user, request.body.branchId ?? request.query.branchId, request.body)
    response.status(201).json({ table, qrCodeDataUrl: await generateQrCode(table.qrToken) })
  } catch (error) { next(error) }
}

export async function deactivateTableHandler(request, response, next) {
  try {
    const branchId = request.body.branchId ?? request.query.branchId ?? request.user.branchId
    response.status(200).json({ table: await deactivateTable(request.user, branchId, request.params.tableId) })
  } catch (error) { next(error) }
}

export async function setTableOccupiedHandler(request, response, next) {
  try {
    const branchId = request.body.branchId ?? request.query.branchId ?? request.user.branchId
    const occupied = Boolean(request.body.occupied)
    response.status(200).json({ table: await setTableOccupied(request.user, branchId, request.params.tableId, occupied) })
  } catch (error) { next(error) }
}

export async function forceReleaseTableHandler(request, response, next) {
  try {
    const branchId = request.body.branchId ?? request.query.branchId ?? request.user.branchId
    response.status(200).json({ table: await forceReleaseTable(request.user, branchId, request.params.tableId) })
  } catch (error) { next(error) }
}

export async function getTableQrHandler(request, response, next) {
  try {
    const branchId = request.query.branchId ?? request.user.branchId
    const tables = await listTables(request.user, branchId)
    const table = tables.find((t) => t.id === request.params.tableId)
    if (!table) return next(Object.assign(new Error('Table not found'), { statusCode: 404 }))
    response.status(200).json({ qrCodeDataUrl: await generateQrCode(table.qrToken) })
  } catch (error) { next(error) }
}
