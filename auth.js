export const checkOwnerToken = (req, res, next) => {
  // const checkOwnerToken = (memberId, req, res) => {
  const { memberId } = req.params;

  if (memberId === req.userInfo.userId) {
    // return true;
    return next();
  } else {
    return res.status(401).json({
      success: false,
      message: `Invalid token.Token not belongs to member (${memberId})`,
    });
  }
};

//authorization TODO 4
export const auth = (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(" ")[1];

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid token!" });
      } else {
        req.userInfo = decoded;

        next();
      }
    });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access!" });
  }
};
