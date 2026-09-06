import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { getHealth, type HealthResponse } from './api/health'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Backend unavailable. Start it with npm run dev.'))
  }, [])

  return (
    <main>
      <nav>
        <strong>SkillSync AI</strong>
        <Link to="/health">Connection health</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/health"
          element={
            <section className="panel">
              <p className="eyebrow">System check</p>
              <h1>Backend connection</h1>
              {health ? <p className="success">{health.message}</p> : null}
              {error ? <p className="error">{error}</p> : null}
              {!health && !error ? <p>Checking the API...</p> : null}
            </section>
          }
        />
      </Routes>
    </main>
  )
}

function Home() {
  return (
    <section className="panel">
      <p className="eyebrow">Workspace ready</p>
      <h1>Build better career conversations.</h1>
      <p>SkillSync AI is ready for its next development slice.</p>
      <Link className="button" to="/health">Check backend health</Link>
    </section>
  )
}

export default App
