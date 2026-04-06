import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../Style/Reservation.css";

const Reservation = ({ onClose, onSuccess, testProp }) => {
  // Removed isSubmitted since we are using an alert now
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- 1. PERSISTENCE LOGIC ---
  const [step, setStep] = useState(
    () => Number(localStorage.getItem("res_step")) || 1,
  );
  const [selectedPackage, setSelectedPackage] = useState(() => {
    const saved = localStorage.getItem("res_package");
    return saved !== "null" && saved !== null ? Number(saved) : null;
  });
  const [guests, setGuests] = useState(
    () => localStorage.getItem("res_guests") || "",
  );
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

  const [otp, setOtp] = useState(new Array(6).fill(""));
  const otpRefs = useRef([]);

  // --- 2. AUTO-SAVE LOGIC ---
  useEffect(() => {
    localStorage.setItem("res_step", step);
    localStorage.setItem("res_guests", guests);
    localStorage.setItem("res_personalInfo", JSON.stringify(personalInfo));
    localStorage.setItem("res_formData", JSON.stringify(formData));
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
      : Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const isPhoneValid = /^09\d{9}$/.test(personalInfo.contactNo);
  const isStep5Valid =
    personalInfo.firstName.trim() !== "" &&
    personalInfo.lastName.trim() !== "" &&
    personalInfo.email.trim() !== "" &&
    isPhoneValid;
  const isStep6Valid = otp.join("").length === 6;
  const getPackageName = (id) => (id ? String.fromCharCode(64 + id) : "");

  // --- 4. OTP & SUBMISSION HANDLERS ---
  const handleSendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/otp/send", { email: personalInfo.email });
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
      };

      console.log("Sending to:", "/api/reservations");

      const response = await axios.post("/api/reservations", reservationData);

      if (response.status === 200 || response.status === 201) {
        //window.alert("Wait for approval! Reservation submitted.");
        [
          "res_step",
          "res_package",
          "res_guests",
          "res_personalInfo",
          "res_formData",
        ].forEach((k) => localStorage.removeItem(k));

        if (typeof onSuccess === 'function') {
          onSuccess(); 
        } else {
          console.error("Prop 'onSuccess' was not passed to Reservation.jsx");
          onClose(); // Fallback so the user isn't stuck
        }
      }
    } catch (err) {
      window.alert(
        "DEBUG ERROR: " + (err.response?.data?.error || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  // --- 5. NAVIGATION ---
  const handleNext = () => {
    setError("");
    if (step === 1) {
      if (formData.date) setStep(2);
      else setError("Please select a date.");
    } else if (step === 2) setStep(3);
    else if (step === 3) {
      if (selectedPackage) setStep(4);
      else setError("Please select a package.");
    } else if (step === 4) {
      if (guests > 0 && guests <= 50) setStep(5);
      else setError("Guests must be between 1 and 50.");
    } else if (step === 5) {
      if (!isStep5Valid) {
        if (!isPhoneValid)
          setError("Phone number must be 11 digits (09XXXXXXXXX).");
        else setError("Please fill in all fields correctly.");
      } else {
        handleSendOTP();
      }
    } else if (step === 6) {
      if (isStep6Valid) handleVerifyOTP();
      else setError("Please enter the 6-digit code.");
    } else if (step === 7) {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else onClose();
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
            <span>Step {step} of 7</span>
            <span>{Math.round((step / 7) * 100)}% Complete</span>
          </div>
          <div className="res-progress-bar-bg">
            <div
              className="res-progress-bar-fill"
              style={{ width: `${(step / 7) * 100}%` }}
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

        {step === 3 && (
          <div className="res-body fade-in">
            <h3>SELECT A PACKAGE</h3>
            <div className="package-container">
              {[1, 2, 3, 4, 5].map((pkg) => (
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
        </div>
      </div>
    </div>
  );
};

export default Reservation;
