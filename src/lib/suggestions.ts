import { db, collection, setDoc, doc, getDocs, handleFirestoreError, OperationType } from "./firebase";
import { Suggestion } from "../types";

/**
 * Saves a custom dropdown value as a suggestion in Firestore
 * Uses fieldName + value as ID to prevent duplicates
 */
export async function saveSuggestion(fieldName: string, value: string) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return;

  // Generate safe document ID preventing duplicates (case-insensitive)
  const docId = `${fieldName.toLowerCase()}_${trimmedValue.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  try {
    const docRef = doc(db, "suggestions", docId);
    await setDoc(docRef, {
      id: docId,
      fieldName,
      value: trimmedValue,
      createdAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error(`Error saving suggestion for ${fieldName}:`, err);
    handleFirestoreError(err, OperationType.WRITE, "suggestions");
  }
}

// Prefill default lists for when there is no database entries yet
export const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  elementType: ["Column", "Beam", "Hollow Core Slab", "Wall Panel", "Foundation", "Staircase", "Boundary Wall", "Slab"],
  villaType: ["4BD", "3BD", "2BD", "6BD", "Penthouse", "Duplex", "Studio"],
  equipmentType: ["Mobile Crane", "Crawler Crane", "Forklift", "Manlift", "Tower Crane", "Gantry Crane"],
  status: ["good", "damage", "reject"],
  zone: ["Zone A", "Zone B", "Zone C", "Zone D", "Main Area", "East Sector", "West Sector"]
};
