const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"BANKING BANK" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};


async function sendRegisterEmail(useremail,name){
    const subject = "Welcome to Our Service!";
    const text = `Hi ${name},\n\nThank you for registering with our service! We're excited to have you on board.\n\nBest regards,\nYour Company Name`;
    const html = `<p>Hi ${name},</p><p>Thank you for registering with our service! We're excited to have you on board.</p><p>Best regards,<br>Your Company Name</p>`;

    await sendEmail(useremail, subject, text, html);
}

async function sendTransactionEmail(useremail,name,amount,transactionType){
    const subject = `Notification of ${transactionType} Transaction`;
    const text = `Hi ${name},\n\nWe wanted to inform you that a ${transactionType} transaction of amount ${amount} has been processed on your account.\n\nBest regards,\nYour Company Name`;
    const html = `<p>Hi ${name},</p><p>We wanted to inform you that a <strong>${transactionType}</strong> transaction of amount <strong>${amount}</strong> has been processed on your account.</p><p>Best regards,<br>Your Company Name</p>`;

    await sendEmail(useremail, subject, text, html);
}


async function sendTransactionFailedEmail(useremail,name,amount,toAccount){
    const subject = `Notification of Failed ${transactionType} Transaction`;
    const text = `Hi ${name},\n\nWe wanted to inform you that a ${transactionType} transaction of amount ${amount} to account ${toAccount} has failed due to insufficient funds.\n\nBest regards,\nYour Company Name`;
    const html = `<p>Hi ${name},</p><p>We wanted to inform you that a <strong>${transactionType}</strong> transaction of amount <strong>${amount}</strong> to account <strong>${toAccount}</strong> has failed due to insufficient funds.</p><p>Best regards,<br>Your Company Name</p>`;

    await sendEmail(useremail, subject, text, html);
}


module.exports = {
    sendRegisterEmail,
    sendTransactionEmail,
    sendTransactionFailedEmail
};