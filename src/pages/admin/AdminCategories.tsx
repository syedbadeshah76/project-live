import { useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { CategoryStats } from "@/components/admin/categories/CategoryStats";
import { CategoryFilters } from "@/components/admin/categories/CategoryFilters";
import { CategoryGrid } from "@/components/admin/categories/CategoryGrid";
import { CategoryCreateModal } from "@/components/admin/categories/CategoryCreateModal";
import { CategoryEditModal } from "@/components/admin/categories/CategoryEditModal";
import { CategoryViewModal } from "@/components/admin/categories/CategoryViewModal";
import { DeleteCategoryDialog } from "@/components/admin/categories/DeleteCategoryDialog";
import { useCategories } from "@/hooks/useCategories";
import type { Category } from "@/types/api.types";

export default function AdminCategories() {
  const {
    tree,
    categories,
    allCategories,
    totalCount,
    parentOptions,
    stats,
    loading,
    statsLoading,
    error,
    search,
    status,
    setSearch,
    setStatus,
    refresh,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  const openView = (c: Category) => { setSelected(c); setViewOpen(true); };
  const openEdit = (c: Category) => { setSelected(c); setEditOpen(true); };
  const openDelete = (c: Category) => { setSelected(c); setDeleteOpen(true); };

  const totalCategories = totalCount || stats?.totalCategories || allCategories.length || categories.length;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Categories</h1>
            <p className="text-sm text-muted-foreground">
              Manage course categories and their subcategories
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Create Category
          </Button>
        </div>

        <CategoryStats stats={stats} loading={statsLoading} />

        <CategoryFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          total={totalCategories}
          shown={categories.length}
        />

        {error && !loading ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Couldn't load categories</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={refresh}>Retry</Button>
          </div>
        ) : null}

        <CategoryGrid
          {...({
            tree,
            categories,
            loading,
            onView: openView,
            onEdit: openEdit,
            onDelete: openDelete,
            onCreate: () => setCreateOpen(true),
          } as any)}
        />

        <CategoryCreateModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={createCategory}
          parentOptions={parentOptions}
        />
        <CategoryEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          category={selected}
          onSubmit={updateCategory}
          parentOptions={parentOptions}
        />
        <CategoryViewModal
          open={viewOpen}
          onOpenChange={setViewOpen}
          category={selected}
          onEdit={openEdit}
        />
        <DeleteCategoryDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          category={selected}
          onConfirm={deleteCategory}
        />
      </div>
    </AdminLayout>
  );
}
