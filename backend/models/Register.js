const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const registerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minLength: 5,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: function (value) {
          const cleanValue = value.replace(/\D/g, ""); // keep only digits
          return cleanValue.length === 10 && cleanValue.startsWith("07");
        },
        message: "Phone number must be in format 07xxxxxxxx",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// ✅ Normalize phone numbers before saving
registerSchema.pre("validate", function (next) {
  if (this.phoneNumber) {
    let phone = this.phoneNumber.toString().trim();
    if (phone.startsWith("+256")) phone = "0" + phone.substring(4);
    else if (phone.startsWith("256")) phone = "0" + phone.substring(3);
    this.phoneNumber = phone;
  }
  next();
});

// ✅ Hash password before saving
registerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Register = mongoose.model("Register", registerSchema);
module.exports = Register;
