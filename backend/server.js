import * as dotenv from 'dotenv'
dotenv.config({ path: new URL('../.env.local', import.meta.url) })
import http from 'node:http'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import authRoutes from './routes/authRoutes.js'
import branchRoutes from './routes/branchRoutes.js'
import billingRoutes from './routes/billingRoutes.js'
import { billingEvents } from './services/billingService.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import kitchenRoutes, { kitchenEvents } from './routes/kitchenRoutes.js'
import menuRoutes from './routes/menuRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import reportsRoutes from './routes/reportsRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'
import staffRoutes from './routes/staffRoutes.js'
import tableRoutes from './routes/tableRoutes.js'
import demoRoutes from './routes/demoRoutes.js'
import superAdminRoutes from './routes/superAdminRoutes.js'
import transferRoutes from './routes/transferRoutes.js'
import { transferEvents } from './services/transferService.js'
import { tableEvents } from './services/tableService.js'
import { uploadRoot } from './middleware/uploadMiddleware.js'
import { bootstrapSuperAdmin } from './services/authService.js'
import { bootstrapDemoBranch, setIo as setDemoIo } from './services/demoService.js'
const app = express()
const server = http.createServer(app)
// All frontend origins that are allowed to talk to this API.
// FRONTEND_ORIGIN is the canonical public URL (LAN or production).
// localhost/127.0.0.1 are always allowed so the dev PC can login.
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_ORIGIN,    // e.g. http://192.168.1.64:5173 or https://chyaroma.example.com
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://breeder-carbon-identify.ngrok-free.dev',
    'https://chyaroma.web.app',
    'https://www.chyaroma.com',
    'https://chyaroma.com',
  ].filter(Boolean)
)

const corsOptions = {
  origin: (origin, callback) => {
    // Requests with no Origin header (server-to-server, curl, Postman, Vite proxy) are fine.
    if (!origin) return callback(null, true)
    // Ngrok tunnels are always allowed for easy mobile testing.
    if (origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) return callback(null, true)
    // Allow any explicitly registered origin.
    if (allowedOrigins.has(origin)) return callback(null, true)
    // Reject everything else — return false (not an Error) so cors sends 403
    // without throwing, which would accidentally trigger the 500 error handler.
    callback(null, false)
  },
  credentials: true,
}

const io = new Server(server, { cors: corsOptions })

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(uploadRoot))
app.use('/api/auth', authRoutes)
app.use('/api/branches', branchRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/tables', tableRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/kitchen', kitchenRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/demo', demoRoutes)
app.use('/api/admin/super-admins', superAdminRoutes)
app.use('/api/transfers', transferRoutes)

app.use((error, request, response, next) => {
  console.error('API error:', error)
  const status = error.statusCode ?? 500
  const message = status === 500 ? 'Internal server error' : error.message
  const body = { error: message }
  if (status === 409 && error.transfer) body.transfer = error.transfer
  response.status(status).json(body)
})

kitchenEvents.on('order-updated', ({ branchId, order }) => {
	io.to(`branch:${branchId}`).emit('order-updated', { branchId, order })
})

billingEvents.on('bill-updated', ({ branchId, bill }) => {
	io.to(`branch:${branchId}`).emit('bill-updated', { branchId, bill })
})

// Table occupancy/availability changes (e.g. cashier force-releases an unpaid table)
// so every staff dashboard's table board updates in real time.
tableEvents.on('table-updated', ({ branchId, table }) => {
	io.to(`staff:${branchId}`).emit('table-updated', { branchId, table })
})

// Staff-only table-transfer alerts (customers never receive these).
transferEvents.on('transfer-requested', ({ branchId, transfer }) => {
	io.to(`staff:${branchId}`).emit('table-transfer-requested', { transfer })
})
transferEvents.on('transfer-resolved', ({ branchId, transfer }) => {
	io.to(`staff:${branchId}`).emit('table-transfer-resolved', { transfer })
})

io.on('connection', (socket) => {
	socket.emit('connected', { ok: true })
	// Client sends { branchId } immediately after connect to join their branch room
	socket.on('join-branch', ({ branchId } = {}) => {
		if (branchId !== undefined && branchId !== null) {
			const branchKey = String(branchId)
			socket.join(`branch:${branchKey}`)
			socket.emit('joined-branch', { branchId: branchKey })
		}
	})
	// Staff sockets join a staff-only room so table-transfer alerts never reach customers.
	socket.on('join-staff', ({ branchId } = {}) => {
		if (branchId !== undefined && branchId !== null) {
			socket.join(`staff:${String(branchId)}`)
			socket.emit('joined-staff', { branchId: String(branchId) })
		}
	})
	// Demo visitor joins their isolated demo room
	socket.on('join-demo', ({ sessionId } = {}) => {
		if (sessionId) {
			socket.join(`demo:${sessionId}`)
			socket.emit('joined-demo', { sessionId })
		}
	})
})

async function start() {
  console.log(' Starting Cafe Central API...')

  console.log('--> Initializing Super Admin account...')
  await bootstrapSuperAdmin()
  console.log('✓ Super Admin initialized.')

  // Pass the Socket.IO instance to demoService before bootstrapping
  setDemoIo(io)

  console.log('--> Bootstrapping Demo Branch...')
  await bootstrapDemoBranch()
  console.log('✓ Demo Branch ready.')

  const PORT = process.env.PORT ?? 3000
  
  // Explicitly keep the process alive and log binding errors
  const instance = server.listen(PORT, () => {
    console.log(` Cafe Central API listening on http://localhost:${PORT}`)
  })

  instance.on('error', (err) => {
    console.error(' Server listen error:', err)
  })
}

start().catch((error) => {
  console.error('Critical startup failure:', error)
  process.exit(1)
})
