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
    <div className="holiday-maintenance-container card shadow-sm border-0 p-4 mt-4">
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
                <td data-label="Date">
                  {new Date(h.block_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td data-label="Reason">{h.reason}</td>
                <td className="text-end" data-label="Action">
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

      <style>{`
        @media (max-width: 768px) {
          .holiday-maintenance-container .table-responsive { overflow: visible; }
          .holiday-maintenance-container thead { display: none; }
          .holiday-maintenance-container .table,
          .holiday-maintenance-container .table tbody,
          .holiday-maintenance-container .table tr,
          .holiday-maintenance-container .table td { display: block; width: 100%; min-width: 0; }
          .holiday-maintenance-container .table tbody tr {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-bottom: 12px;
            padding: 12px 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          }
          .holiday-maintenance-container .table td {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border: none;
            padding: 8px 0;
            text-align: right !important;
            min-width: 0;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .holiday-maintenance-container .table td[data-label]::before {
            content: attr(data-label);
            font-weight: 600;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            text-align: left;
            flex-shrink: 0;
          }
          .holiday-maintenance-container .table td[data-label="Date"] {
            display: block;
            text-align: left !important;
            border-bottom: 1px dashed #e2e8f0;
            margin-bottom: 6px;
            padding-bottom: 10px;
          }
          .holiday-maintenance-container .table td[data-label="Date"]::before { display: none; }
        }
      `}</style>
    </div>
  );
};

export default HolidayMaintenance;
