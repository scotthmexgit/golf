import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: 'postgresql://golfapp:changeme@localhost:5432/golfdb',
  },
})
