require("dotenv").config();
const express = require("express");
const router = express.Router();

const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const User = require("../models/user");
const Token = require("../models/token");

// user register
router.post("/register", async (req, res) => {
  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create a new user
    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
    });

    // Save the user to the database
    await user.save();

    // Send verification email
    sendVerificationEmail(user.email, user._id);

    res.status(200).json({
      message:
        "User registered successfully. Check your email for verification.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// email verify
// email verify
router.get("/:id/verify/:token", async (req, res) => {
  try {
    // find the user with user id
    const user = await User.findOne({ _id: req.params.id });

    if (user) {
      // Update the user to mark as verified
      user.verified = true; // Update the verified field
      await user.save(); // Save the updated user document

      res.json({ success: true, message: "Email Verification Successful." });
    } else {
      res.json({ success: false, message: "User Not Found 404" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// user login
router.post("/login", async (req, res) => {
  try {
    // check if the email is already registered
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Your email is not registered" });
    }

    // check password
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    // resend verification email (if not verified)
    if (!user.verified) {
      sendVerificationEmail(user.email, user._id);
      return res
        .status(401)
        .json({ success: false, message: "An Email sent to your account please verify" });
    }

    if (user && validPassword && user.verified) {
      return res.status(200).json({ success: true, message: "Login successufully" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


//-------------------------------------
// Email sending function (nodemailer)
//-------------------------------------
function sendVerificationEmail(email, user_id) {
  // Generate a verification token
  const token = jwt.sign({ userId: user_id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // Send a verification email
  const transporter = nodemailer.createTransport({
   
    service:"gmail",
        auth:{
            user:"tusharpathania07@gmail.com",
            pass:"pmmd exuk qiuu cnmj"
        },
  });

  const verificationLink = `${process.env.FRONT_END_URL}/${user_id}/verify/${token}`;

  transporter
    .sendMail({
      from: "tusharkumar0510@gmail.com",
      to: email,
      subject: "Email Verification",
      html: `Click <a href="${verificationLink}">here</a> to verify your email.`,
    })
    .then(() => {
      console.log("Email sent successfully");
    })
    .catch((err) => {
      console.error(`Email sent fail : ${err}`);
    });
}

module.exports = router;
