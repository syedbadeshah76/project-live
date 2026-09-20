interface Props {
  name: string;
}

export const CourseNameChip = ({ name }: Props) => (
  <span className="inline-flex items-center rounded-full bg-[#EBF1FF] px-2.5 py-0.5 text-xs font-medium text-[#1E52D6]">
    {name}
  </span>
);
