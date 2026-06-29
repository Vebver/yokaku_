import React, { useState, useEffect } from "react";
import api from "../../api";
import { CalendarOff, Trash2, Plus } from "lucide-react";
import { useToast } from "../ToastContext";
const HolidayMaintenance = () => {
  const { showToast } = useToast();
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ date: "", reason: "" });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await api.get(`/admin/blocked-dates`);
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!newHoliday.date) return showToast("Select a date");
    try {
      await api.post(`/admin/blocked-dates`, newHoliday);
      setNewHoliday({ date: "", reason: "" });
      fetchHolidays();
    } catch (err) {
      showToast("This date is already blocked.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Unblock this date?")) return;
    await api.delete(`/admin/blocked-dates/${id}`);
    fetchHolidays();
  };

  return (
    <div className="card shadow-sm border-0 p-4 mt-4">
      <h5 className="mb-4 text-warning fw-bold d-flex align-items-center">
        <CalendarOff className="me-2" /> Holiday & Closure Management
      </h5>

      <div className="row g-3 align-items-end mb-4">
        <div className="col-md-4">
          <label className="small fw-bold">Date to Block</label>
          <input
            type="date"
            className="form-control"
            value={newHoliday.date}
            onChange={(e) =>
              setNewHoliday({ ...newHoliday, date: e.target.value })
            }
          />
        </div>
        <div className="col-md-5">
          <label className="small fw-bold">Reason (e.g., Staff Party)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Christmas, Renovation, etc."
            value={newHoliday.reason}
            onChange={(e) =>
              setNewHoliday({ ...newHoliday, reason: e.target.value })
            }
          />
        </div>
        <div className="col-md-3">
          <button className="btn btn-warning w-100 fw-bold" onClick={handleAdd}>
            <Plus size={18} /> Block Date
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover table-sm">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Reason</th>
              <th className="text-end">Action</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center text-muted">
                  No blocked dates set.
                </td>
              </tr>
            )}
            {holidays.map((h) => (
              <tr key={h.id}>
                <td>
                  {new Date(h.block_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td>{h.reason}</td>
                <td className="text-end">
                  <button
                    className="btn btn-link text-danger p-0"
                    onClick={() => handleDelete(h.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HolidayMaintenance;
