"use client";

import { useState } from "react";
import RecipeBuilder from "./components/RecipeBuilder";
import ModeSelectorModal from "./components/ModeSelectorModal";

export default function RecipesPage() {
  const [mode, setMode] = useState<"manual" | "ai" | null>(null);

  return (
    <div className="min-h-screen bg-linear-to-br py-4 px-0">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center mb-8">
          <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 tracking-tight text-left">Recipes</h1>
          <p className="text-gray-500 text-base text-left">Create and manage your product recipes with ease and style.</p>
        </div>

        {!mode && (
          <ModeSelectorModal onSelect={(selectedMode) => setMode(selectedMode)} />
        )}

        {mode && (
          <div className="w-full">
            <RecipeBuilder mode={mode} />
          </div>
        )}
      </div>
    </div>
  );
}