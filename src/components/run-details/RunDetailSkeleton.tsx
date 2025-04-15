
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const RunDetailSkeleton: React.FC = () => {
  return (
    <div className="container py-8">
      <Skeleton className="h-12 w-3/4 mb-4" />
      <Skeleton className="h-64 w-full mb-6" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
};

export default RunDetailSkeleton;
