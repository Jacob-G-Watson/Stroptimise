import React, { useState } from "react";

function ProjectForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [kerf_mm, setKerf] = useState("");
  const [allow_rotation, setRotation] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kerf_mm: kerf_mm ? parseInt(kerf_mm) : null, allow_rotation }),
    });
    const data = await res.json();
    onSubmit(data);
  };

  return (
    <form className="mb-4" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-2 py-1 mr-2"
        required
      />
      <input
        type="number"
        placeholder="Kerf (mm)"
        value={kerf_mm}
        onChange={(e) => setKerf(e.target.value)}
        className="border px-2 py-1 mr-2"
      />
      <label className="mr-2">
        <input
          type="checkbox"
          checked={allow_rotation}
          onChange={(e) => setRotation(e.target.checked)}
        />
        Allow Rotation
      </label>
      <button className="px-4 py-1 bg-green-500 text-white" type="submit">
        Create Project
      </button>
    </form>
  );
}

export default ProjectForm;
