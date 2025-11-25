import React, { useState, useMemo, useEffect, useRef } from "react";
import { CheckSquare, Archive, Trash2 } from "lucide-react";
import { useProjectStore } from "../../store/projectStore";
import { useUserStore } from "../../store/userStore";
import { useCardCapacity } from "../../hooks/useCardCapacity";
import { useArchive } from "../../hooks/useArchive";
import { showToast } from "../../utils/toast";
import { canvasApi } from "../../services/api";
import { CanvasPanel } from "../chat";
import {
  VisualCanvas,
  CardCounter,
  CapacityWarning,
  ArchiveSidebar,
} from "../canvas";

interface CanvasPanelControllerProps {
  isDarkMode: boolean;
}

/**
 * CanvasPanelController - Handles all canvas-related functionality
 *
 * Responsibilities:
 * - Canvas item display and management
 * - Bulk selection (select all, archive selected)
 * - Archive sidebar and restore functionality
 * - Capacity tracking and warnings
 * - Auto-clustering when threshold reached
 */
export const CanvasPanelController: React.FC<CanvasPanelControllerProps> = ({
  isDarkMode,
}) => {
  const { user } = useUserStore();
  const {
    currentProject,
    toggleItemArchive,
    setCurrentProject,
    selectedCardIds,
    selectAllCards,
    clearSelection,
    archiveMultipleItems,
  } = useProjectStore();

  // Local state
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [showArchiveAllConfirm, setShowArchiveAllConfirm] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const hasAttemptedClusteringRef = useRef(false);

  // Get project items
  const projectItems = currentProject?.items || [];

  // Get active items (decided + exploring, non-archived)
  const activeItems = useMemo(() => {
    return projectItems.filter(
      (item) =>
        (item.state === "decided" || item.state === "exploring") &&
        !item.isArchived
    );
  }, [projectItems]);

  // Archive hook
  const archive = useArchive(projectItems);

  // Capacity tracking
  const capacity = useCardCapacity(
    activeItems.length,
    archive.archivedCards.length
  );

  // Reset clustering flag when project changes
  useEffect(() => {
    hasAttemptedClusteringRef.current = false;
  }, [currentProject?.id]);

  // Auto-cluster canvas when enough cards exist
  useEffect(() => {
    const attemptAutoClustering = async () => {
      if (!currentProject || !user) return;

      const activeCount = activeItems.length;
      const hasClusters =
        currentProject.clusters && currentProject.clusters.length > 0;

      // Skip if already attempted for this project or conditions not met
      if (hasAttemptedClusteringRef.current) return;
      if (activeCount < 12) return;
      if (hasClusters) return;

      console.log(
        `[CanvasPanelController] Auto-clustering triggered: ${activeCount} cards detected`
      );
      hasAttemptedClusteringRef.current = true;

      try {
        const result = await canvasApi.autoCluster(currentProject.id, 12);

        if (result.success && result.clustered) {
          console.log(
            `[CanvasPanelController] Auto-clustering completed: ${result.clustersCreated} clusters created`
          );

          if (result.project) {
            setCurrentProject(result.project);
          }
        }
      } catch (error) {
        console.error("[CanvasPanelController] Auto-clustering failed:", error);
      }
    };

    attemptAutoClustering();
  }, [
    activeItems.length,
    currentProject?.id,
    currentProject?.clusters,
    user?.id,
    currentProject,
    user,
    setCurrentProject,
  ]);

  // Canvas handlers
  const handleArchiveCard = (itemId: string) => {
    toggleItemArchive(itemId);
  };

  const handleRestoreCard = (itemId: string) => {
    if (capacity.canAddCard) {
      toggleItemArchive(itemId);
    } else {
      showToast(
        "Canvas is at capacity (30 cards). Please archive some cards before restoring.",
        "info"
      );
    }
  };

  const handleWarningAction = (action: string) => {
    if (action.includes("Archive")) {
      setIsArchiveOpen(true);
    }
    capacity.dismissWarning();
  };

  // Bulk selection and archive handlers
  const handleSelectAll = () => {
    selectAllCards();
  };

  const handleArchiveSelected = async () => {
    if (selectedCardIds.size === 0) return;

    setIsArchiving(true);
    try {
      await archiveMultipleItems(Array.from(selectedCardIds));
      clearSelection();
    } catch (error) {
      console.error("Failed to archive selected cards:", error);
      showToast("Failed to archive selected cards. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveAll = () => {
    if (activeItems.length === 0) return;
    setShowArchiveAllConfirm(true);
  };

  const handleArchiveAllConfirmed = async () => {
    setShowArchiveAllConfirm(false);
    setIsArchiving(true);

    try {
      const allActiveIds = activeItems.map((item) => item.id);
      await archiveMultipleItems(allActiveIds);
      clearSelection();
    } catch (error) {
      console.error("Failed to archive all cards:", error);
      showToast("Failed to archive all cards. Please try again.", "error");
    } finally {
      setIsArchiving(false);
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <>
      <CanvasPanel isDarkMode={isDarkMode}>
        <div className="p-4">
          <CardCounter
            capacityState={capacity.capacityState}
            isDarkMode={isDarkMode}
          />

          {/* Bulk Action Buttons */}
          {activeItems.length > 0 && (
            <div className="flex items-center justify-between gap-3 mt-4 mb-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  disabled={
                    isArchiving || selectedCardIds.size === activeItems.length
                  }
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                    isDarkMode
                      ? "bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-300 hover:from-blue-600/40 hover:to-cyan-600/40 border border-blue-500/40"
                      : "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 hover:from-blue-200 hover:to-cyan-200 border border-blue-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <CheckSquare size={16} />
                  Select All ({activeItems.length})
                </button>

                {selectedCardIds.size > 0 && (
                  <button
                    onClick={handleArchiveSelected}
                    disabled={isArchiving}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                      isDarkMode
                        ? "bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-emerald-300 hover:from-green-600/40 hover:to-emerald-600/40 border border-green-500/40"
                        : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 hover:from-green-200 hover:to-emerald-200 border border-green-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Archive size={16} />
                    {isArchiving
                      ? "Archiving..."
                      : `Archive Selected (${selectedCardIds.size})`}
                  </button>
                )}
              </div>

              <button
                onClick={handleArchiveAll}
                disabled={isArchiving}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-lg ${
                  isDarkMode
                    ? "bg-gradient-to-r from-red-600/30 to-rose-600/30 text-red-300 hover:from-red-600/40 hover:to-rose-600/40 border border-red-500/40"
                    : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 hover:from-red-200 hover:to-rose-200 border border-red-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Trash2 size={16} />
                Archive All
              </button>
            </div>
          )}
        </div>
        <VisualCanvas
          items={activeItems}
          isDarkMode={isDarkMode}
          onArchive={handleArchiveCard}
        />
      </CanvasPanel>

      {/* Capacity Warning */}
      {capacity.currentWarning && (
        <CapacityWarning
          warning={capacity.currentWarning}
          onDismiss={capacity.dismissWarning}
          onAction={handleWarningAction}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Archive Sidebar */}
      <ArchiveSidebar
        archivedCards={archive.archivedCards}
        filteredCards={archive.filteredCards}
        searchQuery={archive.searchQuery}
        onSearchChange={archive.setSearchQuery}
        filterType={archive.filterType}
        onFilterChange={archive.setFilterType}
        onRestore={handleRestoreCard}
        onDelete={handleArchiveCard}
        isOpen={isArchiveOpen}
        onToggle={() => setIsArchiveOpen(!isArchiveOpen)}
        isDarkMode={isDarkMode}
      />

      {/* Archive All Confirmation Modal */}
      {showArchiveAllConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className={`max-w-md w-full mx-4 p-6 rounded-2xl shadow-2xl ${
              isDarkMode
                ? "bg-gray-900 border border-gray-700"
                : "bg-white border border-gray-200"
            }`}
          >
            <h3
              className={`text-xl font-semibold mb-4 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Archive All Cards?
            </h3>
            <p
              className={`mb-6 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              This will archive all {activeItems.length} cards currently on the
              canvas. You can restore them from the archive later. Are you sure
              you want to continue?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveAllConfirm(false)}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  isDarkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAllConfirmed}
                className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                  isDarkMode
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
