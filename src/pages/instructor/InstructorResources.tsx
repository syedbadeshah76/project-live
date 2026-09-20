import { motion } from "framer-motion";
import { AboutLiveClassesBanner } from "@/components/meetings/MeetingBanner";
import { ResourceUploadForm } from "@/components/meetings/ResourceUploadForm";

interface InstructorResourcesProps {
  onViewAll: () => void;
}

const InstructorResources = ({ onViewAll }: InstructorResourcesProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <ResourceUploadForm
        onSuccess={() => {
          onViewAll();
        }}
        onViewAll={onViewAll}
      />

      <AboutLiveClassesBanner />
    </motion.div>
  );
};

export default InstructorResources;
