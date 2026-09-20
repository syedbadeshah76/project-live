interface Props {
  count: number;
}

export const StudentCountChip = ({ count }: Props) => (
  <span className="inline-flex items-center rounded-full bg-[#CFFAFE] px-2.5 py-0.5 text-xs font-medium text-[#0E7490]">
    {count.toLocaleString()} students
  </span>
);
