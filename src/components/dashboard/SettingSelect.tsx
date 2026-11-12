// ARCHITECT: строка настроек с выбором из списка: подпись и нативный select в тёмной поверхности.
// Вынесена из страницы вместе с тумблером — это соседние строки одного списка.

interface SettingSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

export function SettingSelect({ label, value, onChange, options }: SettingSelectProps) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-[#141416] px-4 py-3">
            <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
                className="rounded-lg bg-[#1a1a1c] px-3 py-1.5 text-sm text-[#f0f0f5] focus:outline-none focus:ring-1 focus:ring-[#f0f0f5]/20"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}