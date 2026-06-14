import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center font-mono">
      <h1 className="text-2xl font-bold mb-6">🎛️ Distributed Systems Lab Control Center</h1>
      <div className="flex gap-4">
        <Link href="/saga">
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold">
            🔄 Open Saga Orchestrator
          </button>
        </Link>
        <Link href="/load-balancer">
          <button className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold">
            ⚡ Open Load Balancer
          </button>
        </Link>
      </div>
    </div>
  )
}