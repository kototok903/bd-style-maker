import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { label: string; value: string };
type Props = {
  id?: string;
  label: string;
  value: string;
  options?: Option[];
  groups?: { label: string; options: Option[] }[];
  onChange: (value: string) => void;
  disabled?: boolean;
};
export function ChoiceSelect({
  id,
  label,
  value,
  options = [],
  groups,
  onChange,
  disabled,
}: Props) {
  const items = groups ? groups.flatMap((group) => group.options) : options;
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full min-w-0" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {(groups ?? [{ label: "", options }]).map((group) => (
          <SelectGroup key={group.label}>
            {group.label && <SelectLabel>{group.label}</SelectLabel>}
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
