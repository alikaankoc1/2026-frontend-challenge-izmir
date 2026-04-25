import Dashboard from './pages/Dashboard'
import Suspects from './pages/Suspects'
import Tips from './pages/Tips'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'

// Render top-level routes for dashboard and suspects pages.
function App() {
  const getNavClass = ({ isActive }) =>
    `rounded-md border px-3 py-1 text-sm transition ${
      isActive
        ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
    }`

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-amber-300">
          Podo Search: Izmir Mystery
        </h1>

        <nav className="mb-6 flex items-center gap-3">
          <NavLink to="/dashboard" className={getNavClass}>
            Dashboard
          </NavLink>
          <NavLink to="/suspects" className={getNavClass}>
            Suspects
          </NavLink>
          <NavLink to="/tips" className={getNavClass}>
            Tips
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/suspects" element={<Suspects />} />
          <Route path="/tips" element={<Tips />} />
        </Routes>
      </div>
    </main>
  )
}

export default App
