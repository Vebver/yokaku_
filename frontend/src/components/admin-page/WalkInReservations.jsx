import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Armchair, 
  User, 
  Package, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ReceiptText, 
  Info 
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const WalkInReservations = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { fetchWalkIns(); }, []);

  const fetchWalkIns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter for IDs containing "WALK"
      const filtered = res.data.filter(item => 
        item.reservation_id?.toString().includes("WALK") || 
        item.first_name?.toLowerCase().includes("walk-in")
      );
      
      setInquiries(filtered.sort((a, b) => b.reservation_id - a.reservation_id));
    } catch (err) {
      console.error("Fetch Walk-ins error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (resId) => {
    setOrderItems([]);
    setLoadingItems(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/reservations/${resId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderItems(res.data);
    } catch (err) { console.error("Fetch Items error:", err); } 
    finally { setLoadingItems(false); }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = inquiries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(inquiries.length / itemsPerPage);

  if (loading) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container-fluid py-4 text-dark bg-light" style={{ minHeight: '100vh' }}>
      {/* HEADER */}
      <div className="row align-items-center mb-4 px-2">
        <div className="col">
          <h2 className="fw-bold mb-1">Walk-ins & Kiosk</h2>
          <p className="text-muted small mb-0">Monitor instant orders and on-site customers</p>
        </div>
        <div className="col-auto">
          <div className="bg-primary text-white border-0 rounded-pill px-3 py-1 shadow-sm small fw-bold">
            {inquiries.length} Orders
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mx-2">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '900px' }}>
            <thead className="bg-light border-bottom">
              <tr className="text-muted small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: '0.8px' }}>
                <th className="ps-4 py-3">Guest & ID</th>
                <th>Table</th>
                <th>Time In</th>
                <th className="text-center">Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item) => (
                <tr key={item.reservation_id}>
                  <td className="ps-4 py-3">
                    <div className="fw-bold text-dark">{item.first_name} {item.last_name || ""}</div>
                    <code className="text-muted" style={{ fontSize: '0.6rem' }}>{item.reservation_id}</code>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Armchair size={14} className="text-muted" />
                      <span className="fw-bold small">{item.assigned_tables || "T-?"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="fw-bold small">{new Date(item.reservation_date).toLocaleDateString()}</div>
                    <div className="text-muted x-small">{item.reservation_time}</div>
                  </td>
                  <td className="text-center">
                    <span className={`badge rounded-pill px-3 py-1 small ${item.status === 'completed' ? 'bg-secondary' : 'bg-success'}`}>
                      {item.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-end pe-4">
                    <button
                      className="btn btn-sm btn-dark fw-bold px-3 py-1 shadow-sm"
                      data-bs-toggle="offcanvas"
                      data-bs-target="#walkinDetailsDrawer"
                      onClick={() => { setSelectedRes(item); fetchItems(item.reservation_id); }}
                    >
                      Review Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 px-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="text-muted small">
          Showing <strong>{indexOfFirstItem + 1}</strong> to <strong>{Math.min(indexOfLastItem, inquiries.length)}</strong> of <strong>{inquiries.length}</strong>
        </div>
        <nav>
          <ul className="pagination pagination-sm mb-0 shadow-sm border rounded bg-white">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
            </li>
            <li className="page-item disabled"><span className="page-link border-0 text-dark fw-bold px-3 py-2">Page {currentPage} of {totalPages || 1}</span></li>
            <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
              <button className="page-link border-0 px-3 py-2" onClick={() => setCurrentPage(prev => prev + 1)} disabled={currentPage >= totalPages}><ChevronRight size={16} /></button>
            </li>
          </ul>
        </nav>
      </div>

      {/* COMPRESSED DRAWER */}
      <div className="offcanvas offcanvas-end border-0 shadow-sm" tabIndex="-1" id="walkinDetailsDrawer" data-bs-backdrop="false" style={{ width: "min(100%, 450px)" }}>
        <div className="offcanvas-header border-bottom bg-white">
          <h5 className="fw-bold m-0 text-dark"><ReceiptText size={20} className="me-2" />Walk-in Details</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        
        <div className="offcanvas-body bg-white p-0">
          {selectedRes && (
            <div className="d-flex flex-column">
              <div className="p-3 border-bottom bg-light-subtle">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div className="p-2 bg-primary text-white rounded-circle shadow-sm"><User size={18} /></div>
                  <div>
                    <div className="fw-bold text-dark lh-1 mb-1">{selectedRes.first_name} {selectedRes.last_name}</div>
                    <div className="x-small text-muted">Direct Walk-in Customer</div>
                  </div>
                </div>
              </div>

              <div className="p-3 border-bottom">
                <div className="d-flex justify-content-between align-items-center mb-1">
                   <div className="x-small fw-bold text-muted text-uppercase">Session Time</div>
                   <div className="small fw-bold">
                     {(() => {
                     // Convert a DB time string (HH:MM:SS) assuming it is in Asia/Manila.
                     // If your DB server is NOT in Manila, change this by subtracting the offset instead.
                     const toManilaTime = (t) => {
                         if (!t) return "--:--";
                         const parts = String(t).split(":");
                         if (parts.length < 2) return String(t);
                         let hh = parseInt(parts[0], 10);
                         const mm = parseInt(parts[1], 10);
                         if (Number.isNaN(hh) || Number.isNaN(mm)) return String(t);

                         // If DB is UTC but DB returns UTC clock time, uncomment and set the offset:
                         // const MANILA_OFFSET_HOURS = 8;
                         // hh = (hh + MANILA_OFFSET_HOURS) % 24;

                         const hour12 = hh % 12 || 12;
                         const ampm = hh >= 12 ? "PM" : "AM";
                         return `${hour12}:${String(mm).padStart(2, "0")} ${ampm}`;
                       };
                       return `${toManilaTime(selectedRes.reservation_time)} - ${selectedRes.time_ended ? toManilaTime(selectedRes.time_ended) : "Now"}`;
                     })()}
                   </div>

                </div>
              </div>

              <div className="p-3 flex-grow-1 overflow-auto">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Package size={14} className="text-muted" />
                  <span className="x-small fw-bold text-muted text-uppercase">Order Items</span>
                </div>
                {loadingItems ? <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary"></div></div> : (
                  <div className="item-list">
                    {orderItems.map((order, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center py-1">
                        <div className="small text-dark">{order.name || order.item_name} <span className="text-muted small">x{order.quantity}</span></div>
                        <div className="small fw-bold">₱{Number(order.price * order.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-dark text-white sticky-bottom">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <div className="x-small text-white-50 text-uppercase fw-bold">Total Bill</div>
                    <h3 className="fw-bold mb-0">₱{orderItems.reduce((t, i) => t + (Number(i.price) * i.quantity), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <span className={`badge py-2 px-3 bg-success`}>PAID</span>
                </div>
                <button className="btn btn-outline-light btn-sm w-100 fw-bold border-opacity-25" data-bs-dismiss="offcanvas">
                  Close Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .x-small { font-size: 0.65rem; }
        .btn-outline-light:hover { background: rgba(255,255,255,0.1) !important; color: white !important; }
      `}</style>
    </div>
  );
};

export default WalkInReservations;