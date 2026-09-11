export default function AvailabilityToggle({ itemId, isAvailable, onToggle, disabled }) {
	return (
		<button
			id={`availability-toggle-${itemId}`}
			type="button"
			disabled={disabled}
			onClick={() => onToggle(itemId, !isAvailable)}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#F5A623] disabled:opacity-50 ${isAvailable ? 'bg-green-500' : 'bg-stone-300'}`}
			aria-label={isAvailable ? 'Mark unavailable' : 'Mark available'}
			aria-pressed={isAvailable}
		>
			<span className={`inline-block h-4 w-4 rounded-full bg-[#151B2B] shadow transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
		</button>
	)
}
