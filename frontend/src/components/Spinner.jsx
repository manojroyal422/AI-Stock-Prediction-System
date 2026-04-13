export default function Spinner({ size = 'md', text = '' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sz} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
