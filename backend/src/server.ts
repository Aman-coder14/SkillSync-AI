import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    message: 'SkillSync AI backend is running',
  })
})

app.listen(port, () => {
  console.log(`SkillSync AI backend listening on http://localhost:${port}`)
})
