interface Props {
  title: string;
  description?: string;
}

const InstructorPlaceholder = ({ title, description }: Props) => (
  <div className="max-w-2xl mx-auto py-16 text-center">
    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{title}</h1>
    <p className="text-muted-foreground">
      {description ?? "This section is being prepared and will be available soon."}
    </p>
  </div>
);

export default InstructorPlaceholder;
