import React, { useState, useEffect, useRef, use } from "react";
import axios from "axios";
import { X } from "lucide-react"; // Import X icon
import "../Style/Reservation.css";
import TermsModal from "./TermsModal";

const Reservation = ({ onClose, onSuccess, testProp }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState([]);
  const [showTerms, setShowTerms] = useState(false);
  
  // New States for Timer
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // --- 1. PERSISTENCE LOGIC ---
  const [step, setStep] = useState(
    () => Number(localStorage.getItem("res_step")) || 1,
  );
  const [selectedPackage, setSelectedPackage] = useState(() => {
    const saved = localStorage.getItem("res_package");
    return saved !== "null" && saved !== null ? Number(saved) : null;
  });
  // Guests is a simple number input, so we can store it as a string and convert on submit
  const [guests, setGuests] = useState(
    () => localStorage.getItem("res_guests") || "",
  );
  // Personal info includes firstName, lastName, email, contactNo
  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = localStorage.getItem("res_personalInfo");
    return saved
      ? JSON.parse(saved)
      : { firstName: "", lastName: "", email: "", contactNo: "" };
  });
  // Form data includes date, hour, minute, period
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("res_formData");
    return saved
      ? JSON.parse(saved)
      : { date: "", hour: "10", minute: "00", period: "AM" };
  });
  // Payment info includes method, reference, amount (fixed at 500 for downpayment)
  const [paymentInfo, setPaymentInfo] = useState(() => {
    const saved = localStorage.getItem("res_paymentInfo");
    return saved
      ? JSON.parse(saved)
      : { method: "GCash", reference: "", amount: 500 }; // Fixed 500 downpayment
  });

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpRefs = useRef([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await axios.get("/api/products"); // Fetch all products
        const filtered = res.data.filter(
          (item) =>
            item.category_name === "Packages" || item.category === "Packages",
        );
        setPackages(filtered);
      } catch (err) {
        console.error("Error fetching packages:", err);
      }
    };

    fetchPackages();
  }, []);
  // --- Timer Logic for Step 6 ---
  useEffect(() => {
    let interval = null;
    if (step === 6 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Format seconds to M:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- 2. AUTO-SAVE LOGIC ---
  useEffect(() => {
    localStorage.setItem("res_step", step);
    localStorage.setItem("res_guests", guests);
    localStorage.setItem("res_personalInfo", JSON.stringify(personalInfo));
    localStorage.setItem("res_formData", JSON.stringify(formData));
    localStorage.setItem("res_paymentInfo", JSON.stringify(paymentInfo));
    if (selectedPackage !== null)
      localStorage.setItem("res_package", selectedPackage);
  }, [step, selectedPackage, guests, personalInfo, formData]);

  // --- 3. TIME & VALIDATION LOGIC ---
  const hourOptions =
    formData.period === "AM"
      ? ["10", "11"]
      : ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];

  const minuteOptions =
    formData.period === "PM" && formData.hour === "10"
      ? ["00"]
      : ["00", "15", "30", "45"];

  const isPhoneValid = /^09\d{9}$/.test(personalInfo.contactNo);
  const isStep5Valid =
    personalInfo.firstName.trim() !== "" &&
    personalInfo.lastName.trim() !== "" &&
    personalInfo.email.trim() !== "" &&
    isPhoneValid;
  const isStep6Valid = otp.join("").length === 6;
  const isStep7Valid = paymentInfo.reference.trim().length > 6;
  const getPackageName = (id) => (id ? String.fromCharCode(64 + id) : "");

  // --- 4. OTP & SUBMISSION HANDLERS ---
  const handleSendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/otp/send", { email: personalInfo.email });
      setTimer(60); // Reset timer to 1 minute
      setCanResend(false); // Hide resend link
      setStep(6);
    } catch (err) {
      setError(
        err.response?.data?.message || "Error sending code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const code = otp.join("");
      await axios.post("/api/auth/otp/verify", {
        email: personalInfo.email,
        otp: code,
      });
      setStep(7);
    } catch (err) {
      setError("Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const reservationData = {
        userId: localStorage.getItem("userId") || null,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.contactNo,
        date: formData.date,
        time: `${formData.hour}:${formData.minute} ${formData.period}`,
        guests: Number(guests),
        packageName: `Package ${getPackageName(selectedPackage)}`,
        paymentMethod: paymentInfo.method,
        paymentReference: paymentInfo.reference,
        paymentAmount: paymentInfo.amount,
      };

      const response = await axios.post("/api/reservations", reservationData);

      if (response.status === 200 || response.status === 201) {
        [
          "res_step",
          "res_package",
          "res_guests",
          "res_personalInfo",
          "res_formData",
        ].forEach((k) => localStorage.removeItem(k));

        if (typeof onSuccess === "function") {
          onSuccess();
        } else {
          onClose(); 
        }
      }
    } catch (err) {
      window.alert("DEBUG ERROR: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // --- 5. NAVIGATION ---
  const handleNext = () => {
    setError("");
    if (step === 1)
      formData.date ? setStep(2) : setError("Please select a date.");
    else if (step === 2) setStep(3);
    else if (step === 3)
      selectedPackage ? setStep(4) : setError("Please select a package.");
    else if (step === 4)
      guests > 0 && guests <= 50 ? setStep(5) : setError("Guests 1-50.");
    else if (step === 5)
      isStep5Valid
        ? handleSendOTP()
        : setError("Please check contact details.");
    else if (step === 6)
      isStep6Valid ? handleVerifyOTP() : setError("Enter 6-digit code.");
    else if (step === 7)
      isStep7Valid
        ? setStep(8)
        : setError("Please enter a valid reference number.");
    else if (step === 8) handleFinalSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onClose();
  };

  const handleAcceptTerms = () => {
    setShowTerms(false);
    setStep(8); // Proceed to the final step
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    let newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.value !== "" && index < 5) otpRefs.current[index + 1].focus();
  };

  return (
    <div className="res-modal-overlay" onClick={onClose}>
      <div className="res-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="res-logo">
          <h1 className="res-hangout">HANGOUT</h1>
          <p className="res-restobar">Resto Bar</p>
        </div>
        <h2 className="res-title">RESERVE A TABLE</h2>
        <div className="res-progress-section">
          <div className="res-progress-text">
            <span>Step {step} of 8</span>
            <span>{Math.round((step / 8) * 100)}% Complete</span>
          </div>
          <div className="res-progress-bar-bg">
            <div
              className="res-progress-bar-fill"
              style={{ width: `${(step / 8) * 100}%` }}
            ></div>
          </div>
        </div>
        {error && (
          <div
            className="res-error-text"
            style={{
              color: "#d9534f",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}
        {/*STEP 1: CHOOSE A DATE*/}
        {step === 1 && (
          <div className="res-body fade-in">
            <h3>CHOOSE A DATE</h3>
            <div className="res-input-container">
              <label>Reservation Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
          </div>
        )}
        {/*STEP 2: CHOOSE TIME SLOT*/}
        {step === 2 && (
          <div className="res-body fade-in">
            <h3>CHOOSE TIME SLOT</h3>
            <div className="custom-time-picker">
              <div className="time-column">
                <label>Hour</label>
                <div className="scroll-box">
                  {hourOptions.map((h) => (
                    <div
                      key={h}
                      className={`time-item ${formData.hour === h ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, hour: h })}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </div>
              <div className="time-column">
                <label>Minute</label>
                <div className="scroll-box">
                  {minuteOptions.map((m) => (
                    <div
                      key={m}
                      className={`time-item ${formData.minute === m ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, minute: m })}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
              <div className="time-column">
                <label>Period</label>
                <div className="scroll-box">
                  {["AM", "PM"].map((p) => (
                    <div
                      key={p}
                      className={`time-item ${formData.period === p ? "selected" : ""}`}
                      onClick={() => setFormData({ ...formData, period: p })}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {/*STEP 3: SELECT PACKAGE*/}

        {step === 3 && (
          <div className="res-body fade-in">
            <h2 className="res-title">SELECT A PACKAGE</h2>
            <div className="package-container">
              {packages.map((pkg) => (
                <div
                  key={pkg.item_id}
                  className={`package-box ${selectedPackage === pkg.item_id ? "active" : ""}`}
                  onClick={() => setSelectedPackage(pkg.item_id)}
                >
                  {/* 1. Image Container (Top) */}
                  <div className="pkg-img-container">
                    <img
                      src={pkg.image_url || "/logo.png"}
                      alt={pkg.name}
                      className="pkg-img-display"
                    />
                  </div>

                  {/* 2. Details (Below) */}
                  <div className="pkg-details">
                    <span className="pkg-name-text">{pkg.name}</span>
                    <span className="pkg-price-text">
                      ₱{pkg.price ? Number(pkg.price).toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Optional: Selected Item Description shown below the grid */}
            {selectedPackage && (
              <div className="pkg-selection-hint">
                <p>
                  {
                    packages.find((p) => p.item_id === selectedPackage)
                      ?.description
                  }
                </p>
              </div>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="res-body fade-in">
            <h3>NUMBER OF GUESTS</h3>
            <div className="res-input-container">
              <label>Number of Guests (Max 50)</label>
              <input
                type="number"
                value={guests}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value >= 0) {
                    setGuests(value);
                  }
                }}
              />
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="res-body fade-in">
            <h3 className="res-step-title-small">CONTACT INFORMATION</h3>
            <div className="res-form-container">
              <div className="res-form-row">
                <div className="res-input-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={personalInfo.firstName}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="res-input-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={personalInfo.lastName}
                    onChange={(e) =>
                      setPersonalInfo({
                        ...personalInfo,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="res-input-group full-width">
                <label>Email</label>
                <input
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) =>
                    setPersonalInfo({ ...personalInfo, email: e.target.value })
                  }
                />
              </div>
              <div className="res-input-group full-width">
                <label>Contact No.</label>
                <input
                  type="text"
                  placeholder="09XXXXXXXXX"
                  value={personalInfo.contactNo}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 11)
                      setPersonalInfo({ ...personalInfo, contactNo: val });
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {step === 6 && (
          <div className="res-body fade-in">
            <h3>VERIFY EMAIL</h3>
            <p>Enter code sent to {personalInfo.email}</p>
            <div
              className="otp-container"
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              {otp.map((data, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="otp-box"
                  value={data}
                  ref={(el) => (otpRefs.current[index] = el)}
                  onChange={(e) => handleOtpChange(e.target, index)}
                  onKeyDown={(e) =>
                    e.key === "Backspace" &&
                    !otp[index] &&
                    index > 0 &&
                    otpRefs.current[index - 1].focus()
                  }
                />
              ))}
            </div>
          </div>
        )}
        {step === 7 && (
          <div className="res-body fade-in">
            <h3 className="res-step-title-small">DOWNPAYMENT</h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#666",
                marginBottom: "15px",
              }}
            >
              To secure your slot, a <b>₱500.00</b> downpayment is required.
            </p>

            <div
              className="payment-merchant-box"
              style={{
                background: "#f9f9f9",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "1px dashed #ccc",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                <b>GCash / Maya:</b> 0912 345 6789
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                <b>Account Name:</b> Hangout Resto Bar
              </p>
            </div>

            <div className="res-form-container">
              <div className="res-input-group full-width">
                <label>Payment Method</label>
                <select
                  className="res-select"
                  value={paymentInfo.method}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, method: e.target.value })
                  }
                >
                  <option value="GCash">GCash</option>
                  <option value="Maya">Maya</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div
                className="res-input-group full-width"
                style={{ marginTop: "15px" }}
              >
                <label>Reference Number</label>
                <input
                  type="text"
                  placeholder="Enter 13-digit Ref #"
                  value={paymentInfo.reference}
                  onChange={(e) =>
                    setPaymentInfo({
                      ...paymentInfo,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}
        {/* This step is a final review before submission. The "Continue" button
        will trigger the actual submission to the backend. */}
        {step === 8 && (
          <div className="res-body fade-in">
            <h3>CONFIRM DETAILS</h3>
            <div className="res-summary-container">
              <div className="res-summary-row">
                <span>Date:</span> <strong>{formData.date}</strong>
              </div>
              <div className="res-summary-row">
                <span>Time:</span>{" "}
                <strong>
                  {formData.hour}:{formData.minute} {formData.period}
                </strong>
              </div>
              <div className="res-summary-row">
                <span>Package:</span>{" "}
                <strong>Package {getPackageName(selectedPackage)}</strong>
              </div>
              <div className="res-summary-row">
                <span>Guests:</span> <strong>{guests} pax</strong>
              </div>
              <div
                className="res-summary-row"
                style={{
                  borderTop: "1px solid #eee",
                  marginTop: "10px",
                  paddingTop: "10px",
                }}
              >
                <span>Downpayment:</span>{" "}
                <strong>₱{paymentInfo.amount}.00</strong>
              </div>
              <div className="res-summary-row">
                <span>Method:</span> <strong>{paymentInfo.method}</strong>
              </div>
              <div className="res-summary-row">
                <span>Reference:</span> <strong>{paymentInfo.reference}</strong>
              </div>
            </div>
          </div>
        )}
        <div className="res-footer">
          <button
            className="res-btn-back"
            onClick={handleBack}
            disabled={loading}
          >
            Back
          </button>
          <button
            className="res-btn-continue"
            onClick={handleNext}
            disabled={loading}
          >
            {loading ? "..." : step === 7 ? "Submit" : "Continue"}
          </button>

          <div className="res-logo">
            <h1 className="res-hangout">HANGOUT</h1>
            <p className="res-restobar">Resto Bar</p>
          </div>
          <h2 className="res-title">RESERVE A TABLE</h2>

          <div className="res-progress-section">
            <div className="res-progress-text">
              <span>Step {step} of 8</span>
              <span>{Math.round((step / 8) * 100)}% Complete</span>
            </div>
            <div className="res-progress-bar-bg">
              <div
                className="res-progress-bar-fill"
                style={{ width: `${(step / 8) * 100}%` }}
              ></div>
            </div>
          </div>

          {error && <div className="res-error-text" style={{ color: "#d9534f", textAlign: "center", marginBottom: "10px" }}>{error}</div>}

          {step === 1 && (
            <div className="res-body fade-in">
              <h3>CHOOSE A DATE</h3>
              <div className="res-input-container">
                <label>Reservation Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="res-body fade-in">
              <h3>CHOOSE TIME SLOT</h3>
              <div className="custom-time-picker">
                <div className="time-column"><label>Hour</label>
                  <div className="scroll-box">
                    {hourOptions.map((h) => (
                      <div key={h} className={`time-item ${formData.hour === h ? "selected" : ""}`} onClick={() => setFormData({ ...formData, hour: h })}>{h}</div>
                    ))}
                  </div>
                </div>
                <div className="time-column"><label>Minute</label>
                  <div className="scroll-box">
                    {minuteOptions.map((m) => (
                      <div key={m} className={`time-item ${formData.minute === m ? "selected" : ""}`} onClick={() => setFormData({ ...formData, minute: m })}>{m}</div>
                    ))}
                  </div>
                </div>
                <div className="time-column"><label>Period</label>
                  <div className="scroll-box">
                    {["AM", "PM"].map((p) => (
                      <div key={p} className={`time-item ${formData.period === p ? "selected" : ""}`} onClick={() => setFormData({ ...formData, period: p })}>{p}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="res-body fade-in">
              <h3>SELECT A PACKAGE</h3>
              <div className="package-container">
                {[1, 2, 3, 4, 5].map((pkg) => (
                  <div key={pkg} className={`package-box ${selectedPackage === pkg ? "active" : ""}`} onClick={() => setSelectedPackage(pkg)}></div>
                ))}
              </div>
              <button className="view-all-packages">View All Packages</button>
            </div>
          )}

          {step === 4 && (
            <div className="res-body fade-in">
              <h3>NUMBER OF GUESTS</h3>
              <div className="res-input-container">
                <label>Number of Guests (Max 50)</label>
                <input type="number" value={guests} onChange={(e) => { if (e.target.value >= 0) setGuests(e.target.value); }} />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="res-body fade-in">
              <h3 className="res-step-title-small">CONTACT INFORMATION</h3>
              <div className="res-form-container">
                <div className="res-form-row">
                  <div className="res-input-group"><label>First Name</label><input type="text" value={personalInfo.firstName} onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })} /></div>
                  <div className="res-input-group"><label>Last Name</label><input type="text" value={personalInfo.lastName} onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })} /></div>
                </div>
                <div className="res-input-group full-width"><label>Email</label><input type="email" value={personalInfo.email} onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })} /></div>
                <div className="res-input-group full-width"><label>Contact No.</label><input type="text" placeholder="09XXXXXXXXX" value={personalInfo.contactNo} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); if (val.length <= 11) setPersonalInfo({ ...personalInfo, contactNo: val }); }} /></div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="res-body fade-in">
              <h3>VERIFY EMAIL</h3>
              <p>Enter code sent to {personalInfo.email}</p>
              <div className="otp-container" style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "15px" }}>
                {otp.map((data, index) => (
                  <input key={index} type="text" maxLength="1" className="otp-box" value={data} ref={(el) => (otpRefs.current[index] = el)} onChange={(e) => handleOtpChange(e.target, index)} onKeyDown={(e) => e.key === "Backspace" && !otp[index] && index > 0 && otpRefs.current[index - 1].focus()} />
                ))}
              </div>
              <div style={{ textAlign: "center", fontSize: "0.9rem" }}>
                {timer > 0 ? (
                  <p style={{ color: "#666" }}>Resend code in: <span style={{ color: "#ffcc00", fontWeight: "bold" }}>{formatTime(timer)}</span></p>
                ) : (
                  <p>Didn't receive the code? <a href="#" onClick={(e) => { e.preventDefault(); handleSendOTP(); }} style={{ color: "#ffcc00", textDecoration: "underline", fontWeight: "bold" }}>Resend Code</a></p>
                )}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="res-body fade-in">
              <h3>CONFIRM DETAILS</h3>
              <div className="res-summary-container">
                <div className="res-summary-row"><span>Date:</span> <strong>{formData.date}</strong></div>
                <div className="res-summary-row"><span>Time:</span> <strong>{formData.hour}:{formData.minute} {formData.period}</strong></div>
                <div className="res-summary-row"><span>Package:</span> <strong>Package {getPackageName(selectedPackage)}</strong></div>
                <div className="res-summary-row"><span>Guests:</span> <strong>{guests} pax</strong></div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="res-body fade-in">
              <div style={{ backgroundColor: '#fff', minHeight: '150px', borderRadius: '10px' }}>
                {/* Plain white for the mean time */}
              </div>
            </div>
          )}

          <div className="res-footer">
            <button className="res-btn-back" onClick={handleBack} disabled={loading}>Back</button>
            <button className="res-btn-continue" onClick={handleNext} disabled={loading}>
              {loading ? "..." : step === 8 ? "Submit" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reservation;