import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../Style/Reservation.css";

const Reservation = ({ onClose }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  // --- 1. PERSISTENCE LOGIC (Load from LocalStorage) ---
  const [step, setStep] = useState(() => {
    return Number(localStorage.getItem("res_step")) || 1;
  });

  const [selectedPackage, setSelectedPackage] = useState(() => {
    const saved = localStorage.getItem("res_package");
    return saved !== "null" ? Number(saved) : null;
  });

  const [guests, setGuests] = useState(() => {
    return localStorage.getItem("res_guests") || "";
  });

  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = localStorage.getItem("res_personalInfo");
    return saved
      ? JSON.parse(saved)
      : { firstName: "", lastName: "", email: "", contactNo: "" };
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem("res_formData");
    return saved
      ? JSON.parse(saved)
      : { date: "", hour: "10", minute: "00", period: "AM" };
  });

  // --- 2. AUTO-SAVE LOGIC (Save to LocalStorage on change) ---
  useEffect(() => {
    localStorage.setItem("res_step", step);
    localStorage.setItem("res_package", selectedPackage);
    localStorage.setItem("res_guests", guests);
    localStorage.setItem("res_personalInfo", JSON.stringify(personalInfo));
    localStorage.setItem("res_formData", JSON.stringify(formData));
  }, [step, selectedPackage, guests, personalInfo, formData]);

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpRefs = useRef([]);

  const totalSteps = 7;
  const progressPercent = Math.round((step / totalSteps) * 100);

  const hourOptions =
    formData.period === "AM"
      ? ["10", "11"]
      : ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
  const minuteOptions =
    formData.period === "PM" && formData.hour === "10"
      ? ["00"]
      : Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // --- VALIDATION HELPERS ---
  const isStep5Valid =
    personalInfo.firstName.trim() !== "" &&
    personalInfo.lastName.trim() !== "" &&
    personalInfo.email.trim() !== "" &&
    personalInfo.contactNo.trim() !== "";

  // Join the array and check if length is exactly 6
  const isStep6Valid = otp.join("").length === 6;

  const getPackageName = (id) => (id ? String.fromCharCode(64 + id) : "");

  // --- 3. BACKEND SUBMISSION LOGIC ---
  // --- 3. THE RIGHT WAY: SUBMIT ONLY TO DATABASE ---
  const handleFinalSubmit = async () => {
    try {
      // Prepare the data
      const reservationData = {
        userId: localStorage.getItem("userId") || null,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        phone: personalInfo.contactNo,
        date: formData.date,
        // Convert "12:00 PM" to 24hr for your database logic
        time: `${formData.hour}:${formData.minute} ${formData.period}`,
        guests: guests,
        packageName: `Package ${getPackageName(selectedPackage)}`,
      };

      // A. Call the Backend
      const response = await axios.post(
        "http://localhost:5000/api/reserve",
        reservationData,
      );

      // B. ONLY if the database save was successful:
      if (response.status === 200 || response.status === 201) {
        // 1. Clear all persistence memory
        localStorage.removeItem("res_step");
        localStorage.removeItem("res_package");
        localStorage.removeItem("res_guests");
        localStorage.removeItem("res_personalInfo");
        localStorage.removeItem("res_formData");

        // 2. NOW (and only now) show the success modal
        setIsSubmitted(true);
      }
    } catch (err) {
      // If the database crashes or columns are missing, we stay on Step 7
      console.error("Database Error:", err);
      alert(
        "COULD NOT SAVE RESERVATION: " +
          (err.response?.data?.error || "Server is offline."),
      );
    }
  };

  // --- THE RIGHT WAY: NAVIGATION ---
  const handleNext = () => {
    // If we are on the receipt (Step 7), trigger the database save
    if (step === 7) {
      handleFinalSubmit();
    }
    // Otherwise, move through the steps normally
    else if (step === 1 && formData.date) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3 && selectedPackage) setStep(4);
    else if (step === 4 && guests > 0 && guests <= 50) setStep(5);
    else if (step === 5 && isStep5Valid) setStep(6);
    else if (step === 6 && isStep6Valid) setStep(7);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onClose();
  };

  const handleOtpChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return false;

    let newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== "" && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const packages = [1, 2, 3, 4, 5];

  // Logic to determine if the "Continue" button should be disabled for the CURRENT step
  const isButtonDisabled = () => {
    if (step === 1) return !formData.date;
    if (step === 3) return !selectedPackage;
    if (step === 4) return !guests || guests <= 0 || guests > 50;
    if (step === 5) return !isStep5Valid;
    if (step === 6) return !isStep6Valid;
    return false;
  };

  return (
    <div className="res-modal-overlay" onClick={onClose}>
      <div className="res-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="res-close-btn" onClick={onClose}>
          &times;
        </button>

        {isSubmitted ? (
          <div className="res-success-view fade-in">
            <div className="success-icon-circle">
              <svg
                viewBox="0 0 24 24"
                width="60"
                height="60"
                stroke="#ffcc00"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>SUBMITTED SUCCESSFULLY</h2>
            <p>Your reservation request has been received.</p>
            <p className="small-notice">
              Please wait for an email regarding your booking status.
            </p>
            <button
              className="res-btn-continue"
              style={{ marginTop: "20px" }}
              onClick={onClose}
            >
              GREAT!
            </button>
          </div>
        ) : (
          <>
            <div className="res-logo">
              <h1 className="res-hangout">HANGOUT</h1>
              <p className="res-restobar">Resto Bar</p>
            </div>
            <h2 className="res-title">RESERVE A TABLE</h2>

            <div className="res-progress-section">
              <div className="res-progress-text">
                <span>
                  Step {step} of {totalSteps}
                </span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="res-progress-bar-bg">
                <div
                  className="res-progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* --- STEP 1: DATE --- */}
            {step === 1 && (
              <div className="res-body fade-in">
                <div className="res-icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    width="50"
                    height="50"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <polyline points="9 16 11 18 15 14"></polyline>
                  </svg>
                </div>
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

            {/* --- STEP 2: TIME --- */}
            {step === 2 && (
              <div className="res-body fade-in">
                <div className="res-icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    width="50"
                    height="50"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
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
                          onClick={() =>
                            setFormData({ ...formData, minute: m })
                          }
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
                          onClick={() =>
                            setFormData({ ...formData, period: p })
                          }
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 3: PACKAGE --- */}
            {step === 3 && (
              <div className="res-body fade-in">
                <div className="res-icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    width="45"
                    height="45"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                    <path d="m3.3 7 8.7 5 8.7-5"></path>
                    <path d="M12 22V12"></path>
                  </svg>
                </div>
                <h3>SELECT A PACKAGE</h3>
                <div className="package-container">
                  {packages.map((pkg) => (
                    <div
                      key={pkg}
                      className={`package-box ${selectedPackage === pkg ? "active" : ""}`}
                      onClick={() => setSelectedPackage(pkg)}
                    ></div>
                  ))}
                </div>
                <button className="view-all-packages">View All Packages</button>
              </div>
            )}

            {/* --- STEP 4: GUESTS --- */}
            {step === 4 && (
              <div className="res-body fade-in">
                <div className="res-icon-circle">
                  <svg
                    viewBox="0 0 24 24"
                    width="50"
                    height="50"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h3>NUMBER OF GUESTS</h3>
                <div className="res-input-container">
                  <label>Number of Guests (Max 50)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter number of guests"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  />
                  {guests > 50 && (
                    <p
                      className="res-error-text"
                      style={{
                        color: "#d9534f",
                        marginTop: "5px",
                        fontSize: "12px",
                      }}
                    >
                      Sorry, we can only accommodate up to 50 guests.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* --- STEP 5: CONTACT INFO --- */}
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
                        setPersonalInfo({
                          ...personalInfo,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="res-input-group full-width">
                    <label>Contact No.</label>
                    <input
                      type="text"
                      value={personalInfo.contactNo}
                      onChange={(e) =>
                        setPersonalInfo({
                          ...personalInfo,
                          contactNo: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- STEP 6: OTP --- */}
            {step === 6 && (
              <div className="res-body fade-in">
                <h3 className="res-step-title-small">EMAIL VERIFICATION</h3>
                <p>
                  We sent a 6-digit code to <br />
                  <strong>{personalInfo.email}</strong>
                </p>
                <div className="otp-container">
                  {otp.map((data, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength="1"
                      className="otp-box"
                      value={data}
                      ref={(el) => (otpRefs.current[index] = el)}
                      onChange={(e) => handleOtpChange(e.target, index)}
                      onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    />
                  ))}
                </div>
                <p className="res-resend-text">
                  Didn't receive code?{" "}
                  <span className="res-gold-link">Resend</span>
                </p>
              </div>
            )}

            {/* --- STEP 7: RECEIPT --- */}
            {step === 7 && (
              <div className="res-body fade-in">
                <h3 className="res-confirm-title">CONFIRM YOUR RESERVATION</h3>
                <div className="res-summary-container">
                  <div className="res-summary-row">
                    <span>Date:</span> <strong>{formData.date}</strong>
                  </div>
                  <div className="res-summary-row">
                    <span>Time:</span>{" "}
                    <strong>{`${formData.hour}:${formData.minute} ${formData.period}`}</strong>
                  </div>
                  <div className="res-summary-row">
                    <span>Package:</span>{" "}
                    <strong>Package {getPackageName(selectedPackage)}</strong>
                  </div>
                  <div className="res-summary-row">
                    <span>Guests:</span> <strong>{guests} pax</strong>
                  </div>
                  <hr className="res-summary-divider" />
                  <div className="res-summary-row">
                    <span>Name:</span>{" "}
                    <strong>{`${personalInfo.firstName} ${personalInfo.lastName}`}</strong>
                  </div>
                  <div className="res-summary-row">
                    <span>Email:</span> <strong>{personalInfo.email}</strong>
                  </div>
                  <div className="res-summary-row">
                    <span>Phone:</span>{" "}
                    <strong>{personalInfo.contactNo}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="res-footer">
              <button className="res-btn-back" onClick={handleBack}>
                Back
              </button>
              <button
                className="res-btn-continue"
                onClick={handleNext}
                disabled={
                  (step === 1 && !formData.date) ||
                  (step === 3 && !selectedPackage) ||
                  (step === 4 && (!guests || guests <= 0 || guests > 50)) ||
                  (step === 5 && !isStep5Valid) ||
                  (step === 6 && !isStep6Valid)
                  // IMPORTANT: No disabled logic for Step 7 here!
                }
              >
                {step === 7 ? "Submit" : "Continue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reservation;
