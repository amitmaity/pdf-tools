import { QUALITY_PRESETS, type QualityPreset } from '../lib/qualityPresets'

interface QualitySliderProps {
  quality: number
  onChange: (quality: number) => void
  preset: QualityPreset
  onPresetChange: (preset: QualityPreset) => void
}

export function QualitySlider({
  quality,
  onChange,
  preset,
  onPresetChange,
}: QualitySliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              onPresetChange(key)
              onChange(QUALITY_PRESETS[key])
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
              preset === key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          JPEG quality: {Math.round(quality * 100)}%
        </label>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={quality}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-indigo-600"
        />
      </div>
    </div>
  )
}
