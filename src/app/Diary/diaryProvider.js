const { pool } = require("../../../config/database");
const diaryDao = require("./diaryDao");

// Provider: Read 비즈니스 로직 처리

exports.retrieveDiaryList = async function (select_date_start, select_date_end, user_id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.selectFromAllDiaryList(connection, select_date_start, select_date_end, user_id);
  connection.release();

  return result;
};

// exports.retrieveDiary = async function (diary_id) {
//   const connection = await pool.getConnection(async (conn) => conn);
//   const result = await diaryDao.selectFromDiary(connection, diary_id);
//   connection.release();

//   return result;
// };

exports.createDiary = async function (user_id, pet_id, date, diary_title, diary_content, diary_img_url_1, diary_img_url_2, diary_img_url_3, diary_img_url_4, diary_img_url_5) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.insertIntoDiary(connection, user_id, pet_id, date, diary_title, diary_content, diary_img_url_1, diary_img_url_2, diary_img_url_3, diary_img_url_4, diary_img_url_5);
  connection.release();

  return result;
};

exports.retrieveDiaryOwnerId = async function (diary_id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.selectFromUserIdAtDiary(connection, diary_id);
  connection.release();

  return result;
};

exports.modifyDiary = async function (pet_id, date, diary_title, diary_content, diary_img_url_1, diary_img_url_2, diary_img_url_3, diary_img_url_4, diary_img_url_5, diary_id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.updateSetDiary(connection, pet_id, date, diary_title, diary_content, diary_img_url_1, diary_img_url_2, diary_img_url_3, diary_img_url_4, diary_img_url_5, diary_id);
  connection.release();

  return result;
};

exports.removeDiary = async function (diary_id) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.deleteFromDiary(connection, diary_id);
  connection.release();

  return result;
};

exports.getMonthDateList = async function (user_id, select_date_start, select_date_end) {
  const connection = await pool.getConnection(async (conn) => conn);
  const result = await diaryDao.selectDistinctFromDate(connection, user_id, select_date_start, select_date_end);
  connection.release();

  return result;
};