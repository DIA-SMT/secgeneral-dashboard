import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function ProyectosLoading() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <ListSkeleton rows={7} />
    </div>
  );
}
