import Dashboard from './pages/Dashboard'

// Render the dashboard page as the default screen.
function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-amber-300">
          Podo Search: Izmir Mystery
        </h1>
        <Dashboard />
      </div>
    </main>
  )
}

export default App
