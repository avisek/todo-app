import express from 'express' 
// import { join } from 'node:path/posix'
import { remultExpress } from 'remult/remult-express'
import { Task } from '../shared/Task'
import { TasksController } from '../shared/TasksControlletr'
import { createPostgresDataProvider } from 'remult/postgres'

export const app = express()

// app.use(express.json())
// app.use(express.urlencoded({ extended: false }))

// const api = express.Router()
// app.use(join(import.meta.env.BASE_URL, '/api'), api)

// api.get('/test', (_, res) =>
//   res.json({ greeting: 'Hello from Express!' })
// )

//#region auth
import session from 'cookie-session'
import type { UserInfo } from 'remult'

app.use(
  '/api',
  session({ secret: process.env['SESSION_SECRET'] || 'my secret' })
)

export const validUsers: UserInfo[] = [
  { id: '1', name: 'Jane', roles: ['admin'] },
  { id: '2', name: 'Steve' },
]
app.post('/api/signIn', express.json({ type: 'text' }), (req, res) => {
  const user = validUsers.find((user) => user.name === req.body.username)
  if (user) {
    req.session!['user'] = user
    res.json(user)
  } else {
    res.status(404).json("Invalid user, try 'Steve' or 'Jane'")
  }
})

app.post('/api/signOut', (req, res) => {
  req.session!['user'] = null
  res.json('signed out')
})

app.get('/api/currentUser', (req, res) => {
  res.json(req.session!['user'])
})
//#endregion

app.get('/hi', (_, res) => res.send('hello'))

const entities = [Task]

const api = remultExpress({
  entities,
  controllers: [TasksController],
  dataProvider: createPostgresDataProvider({
    connectionString:
      process.env['DATABASE_URL'] ||
      'postgresql://postgres:6fBC626fBGc13E2d*F6Bd6DAGbCADfFA@viaduct.proxy.rlwy.net:29360/railway' ||
      'postgresql://postgres:c5-Gd65CGBbdC4b6db25dbeA24Fg1Fed@viaduct.proxy.rlwy.net:57932/railway' ||
      'postgres://postgres:MASTERKEY@localhost/postgres',
  }),
  getUser: (req) => req.session?.['user'],
})
app.use(api)

import swaggerUi from 'swagger-ui-express'

const openApiDocument = api.openApiDoc({ title: 'remult-react-todo' })
app.get('/api/openApi.json', (_, res) => res.json(openApiDocument))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

import { remultGraphql } from 'remult/graphql'
import { createYoga, createSchema } from 'graphql-yoga'

const { typeDefs, resolvers } = remultGraphql({
  entities: [Task],
})
const yoga = createYoga({
  graphqlEndpoint: '/api/graphql',
  schema: createSchema({
    typeDefs,
    resolvers,
  }),
})
app.use(yoga.graphqlEndpoint, api.withRemult, yoga)

if (!process.env['VITE']) {
  const frontendFiles = process.cwd() + '/dist'
  app.use(express.static(frontendFiles))
  app.get('/*', (_, res) => {
    res.sendFile(frontendFiles + '/index.html')
  })
  app.listen(process.env['PORT'] || 3002, () => console.log('Server started'))
}
