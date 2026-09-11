import { createCategory, createMenuItem, deactivateCategory, listMenu, toggleAvailability, updateCategory, updateMenuItem } from '../services/menuService.js'

function payloadWithImage(request) {
  // When an image was uploaded (multipart), store its served URL.
  if (request.file) return { ...request.body, imageUrl: `/uploads/menu/${request.file.filename}` }
  return request.body
}

export async function getMenu(request, response, next) { try { response.status(200).json(await listMenu(request.user, request.query.branchId)) } catch (error) { next(error) } }
export async function createCategoryHandler(request, response, next) { try { response.status(201).json({ category: await createCategory(request.user, request.body.branchId ?? request.query.branchId, request.body) }) } catch (error) { next(error) } }
export async function updateCategoryHandler(request, response, next) { try { response.status(200).json({ category: await updateCategory(request.user, request.body.branchId ?? request.query.branchId, request.params.categoryId, request.body) }) } catch (error) { next(error) } }
export async function deactivateCategoryHandler(request, response, next) { try { response.status(200).json({ category: await deactivateCategory(request.user, request.body.branchId ?? request.query.branchId, request.params.categoryId) }) } catch (error) { next(error) } }
export async function createMenuItemHandler(request, response, next) { try { response.status(201).json({ item: await createMenuItem(request.user, request.body.branchId ?? request.query.branchId, payloadWithImage(request)) }) } catch (error) { next(error) } }
export async function updateMenuItemHandler(request, response, next) { try { response.status(200).json({ item: await updateMenuItem(request.user, request.body.branchId ?? request.query.branchId, request.params.itemId, payloadWithImage(request)) }) } catch (error) { next(error) } }
export async function toggleAvailabilityHandler(request, response, next) { try { response.status(200).json({ item: await toggleAvailability(request.user, request.body.branchId ?? request.query.branchId, request.params.itemId, request.body.isAvailable) }) } catch (error) { next(error) } }
