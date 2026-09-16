"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Participants() {
  const [d, setD] = useState<any>(null);
  const [e, setE] = useState("");

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/organiser/state", {
      cache: "no-store",
    });

    const x = await r.json().catch(() => null);

    if (r.ok) {
      setD(x);
      setE("");
    } else {
      setE(x?.error || "Failed");
    }
  };

  useEffect(() => {
    load();

    const t = setInterval(load, 1000);

    return () => clearInterval(t);
  }, []);

  async function addParticipant() {
    if (!name.trim()) {
      setE("Enter participant name.");
      return;
    }

    if (!department.trim()) {
      setE("Enter department.");
      return;
    }

    setSaving(true);
    setE("");

    try {
      const r = await fetch("/api/organiser/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          department: department.trim(),
        }),
      });

      const x = await r.json().catch(() => null);

      if (!r.ok) {
        setE(x?.error || "Failed to add participant.");
        return;
      }

      setName("");
      setDepartment("");

      await load();
    } catch {
      setE("Failed to add participant.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteParticipant(
    id: string,
    participantName: string
  ) {
    const ok = window.confirm(
      `Delete participant "${participantName}"?`
    );

    if (!ok) return;

    setE("");

    try {
      const r = await fetch("/api/organiser/participants", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const x = await r.json().catch(() => null);

      if (!r.ok) {
        setE(x?.error || "Failed to delete participant.");
        return;
      }

      await load();
    } catch {
      setE("Failed to delete participant.");
    }
  }

  return (
    <main className="shell">
      <div className="top">
        <div>
          <div className="tag">
            NEXOVERSE&apos;26 • ORGANISER
          </div>
          <h1>Participants</h1>
        </div>

        <Link
          className="btn"
          href="/organiser/dashboard"
        >
          Dashboard
        </Link>
      </div>

      {e && <p className="error">{e}</p>}

      {/* ADD PARTICIPANT */}
      <div className="card">
        <h2>Add Participant</h2>

        <div
          style={{
            display: "grid",
            gap: 12,
            maxWidth: 500,
          }}
        >
          <input
            className="input"
            type="text"
            placeholder="Participant name"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
          />

          <input
            className="input"
            type="text"
            placeholder="Department (Example: IT)"
            value={department}
            onChange={(ev) =>
              setDepartment(ev.target.value)
            }
          />

          <button
            className="btn"
            onClick={addParticipant}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Participant"}
          </button>
        </div>
      </div>

      {/* PARTICIPANT LIST */}
      <div className="card">
        <h2>Participant List</h2>

        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Department</th>
              <th>Status</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {(d?.participants || []).map(
              (p: any, i: number) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.name}</td>
                  <td>{p.department}</td>
                  <td>{p.status}</td>
                  <td>{p.score}</td>

                  <td>
                    <button
                      className="btn"
                      onClick={() =>
                        deleteParticipant(
                          p.id,
                          p.name
                        )
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {!d?.participants?.length && (
          <p className="muted">
            No participants joined yet.
          </p>
        )}
      </div>
    </main>
  );
}