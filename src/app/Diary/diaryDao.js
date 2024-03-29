const mysql = require('mysql2/promise');

// 이미지 리스트 조회
const selectImageUrls = async (connection) => {
  return (await connection.query(`
  SELECT diary_img.diary_id, diary_img.img_url
  FROM diary, diary_img
  WHERE diary.diary_id = diary_img.diary_id;
  `))[0]; // 이미지 리스트 반환 sql
}

// 일기:이미지 = 1:N 매핑 (memoization)
// 일기 리스트에 적용
const diaryListImgMapping = (diarys, imgs) => {
  let url_memo = Array.from({ length: diarys[diarys.length - 1].diary_id }, () => []); // 마지막 게시글의 post_id개의 빈 배열 생성
  for (let i = 0; i < imgs.length; i++) { // 이미지 리스트 순회
    const current_img_post_id = imgs[i].diary_id; // 현재 탐색중인 이미지의 post_id
    if (current_img_post_id <= url_memo.length) { // 현재 탐색중인 이미지의 post_id가 마지막 게시글(질문글 or 자랑글)의 post_id를 초과하지 않을 때
      url_memo[current_img_post_id - 1].push(process.env.IMAGE_URL + imgs[i].img_url); // 게시글에 해당하는 메모 배열의 원소에 이미지 url 매핑
    }
  }

  for (let i = 0; i < diarys.length; i++) {
    diarys[i].img_url = url_memo[diarys[i].diary_id - 1]; // 게시글과 해당하는 메모 배열 매핑
  }
  return diarys;
}

// 사용자의 특정 날짜 일기 모두 조회
async function selectFromAllDiaryList(connection, select_date_start, select_date_end, user_id) {
  const diary_sql = mysql.format(`
    SELECT diary.*, pet.pet_name, pet.pet_profile_img, pet.pet_tag
    FROM diary, pet 
    WHERE diary.pet_id = pet.pet_id
    and diary.created_time BETWEEN ? AND ?
    and diary.user_id = ?;
  `, [select_date_start, select_date_end, user_id]);
  const diarys = (await connection.query(diary_sql))[0]; // 일기 리스트
  const imgs = await selectImageUrls(connection); // 이미지 리스트
  let contents = []
  if (diarys.length > 0) { // 게시글이 존재한다면
    contents = diaryListImgMapping(diarys, imgs); // 게시글, 이미지 매핑
  }

  return contents;
}

// 생성할 일기 id 반환 메서드
const getLastDiaryId = async (connection) => {
  let diary_id = (await connection.query(
    `SELECT MAX(diary_id)+1 FROM diary;`
  ))[0][0]['MAX(diary_id)+1']; // 가장 최신 게시글 id + 1 = 현재 작성할 게시글 id
  if (diary_id == null) {
    diary_id = 1; // 작성된 게시글이 없을 경우의 초기 게시글 식별자 = 1
  }
  return diary_id;
}

// 일기 이미지 경로 삽입 sql
const insertDiaryImgSql = (diary_id, imagesPath) => {
  diary_img_sql = "";
  if (imagesPath) { // 이미지가 존재할 경우
    imagesPath.map((img_url) => {
      diary_img_sql += mysql.format(`
      INSERT INTO diary_img (diary_id, img_url) VALUES (?, ?);`, // 쿼리문 생성
        [diary_id, img_url]);
    });
  }
  return diary_img_sql;
}

// 일기 생성
async function insertIntoDiary(connection, contents) {
  const diary_id = await getLastDiaryId(connection);
  const diary_sql = mysql.format(`
    INSERT INTO diary 
    (diary_id, pet_id, user_id, created_time, diary_title, diary_content) 
    VALUES (?, ?, ?, ?, ?, ?); 
  `,
    [diary_id, contents.pet_id, contents.user_id, contents.date, contents.diary_title, contents.diary_content]);

  const diary_img_sql = insertDiaryImgSql(diary_id, contents.imagesPath); // 이미지 경로 삽입 sql

  const Rows = await connection.query(diary_sql + diary_img_sql);

  return Rows[0][0];
}

// 일기 조회
// async function selectFromDiary(connection, diary_id) {
//   const query = mysql.format(`SELECT diary.diary_id, diary.pet_id, pet.pet_name, pet.pet_tag, diary.diary_title, diary.diary_content,
//   diary.date, diary.diary_img_url_1,diary. diary_img_url_2, diary.diary_img_url_3,
//   diary.diary_img_url_4, diary.diary_img_url_5
//   FROM COMPAION_DIARY_DB.diary
//   LEFT JOIN COMPAION_DIARY_DB.pet
//   ON diary.pet_id = pet.pet_id
//   WHERE diary.diary_id = ?;`, [diary_id]);
//   const Rows = await connection.query(query);

//   return Rows[0];
// }

// 일기 작성자 조회
async function selectFromUserIdAtDiary(connection, diary_id) {
  const query = mysql.format(`SELECT user_id FROM diary WHERE diary_id = ?;`, [diary_id]);
  const Rows = await connection.query(query);

  return Rows[0];
}

// 주어진 일기에 해당하는 이미지들 삭제 sql
const deleteDiaryImgSql = (diary_id) => {
  return mysql.format(`DELETE FROM diary_img WHERE diary_id = ?;`, [diary_id])
}

// 일기 수정
async function updateSetDiary(connection, contents) {
  await connection.query(deleteDiaryImgSql(contents.content_id)); // 현재 일기와 연관된 이미지들 삭제
  const diary_update_query = mysql.format(`UPDATE diary SET pet_id = ?, updated_time = now(), diary_title = ?, diary_content = ? WHERE diary_id = ?;`, [contents.pet_id, contents.diary_title, contents.diary_content, contents.content_id]);
  const diary_img_sql = insertDiaryImgSql(contents.content_id, contents.imagesPath); // 업데이트된 내용 + 새로운 이미지

  const Rows = await connection.query(diary_update_query + diary_img_sql);

  return Rows[0];
}

// 일기 삭제
async function deleteFromDiary(connection, diary_id) {
  const delete_diary_sql = mysql.format(`DELETE FROM diary WHERE diary_id = ?;`, [diary_id]);
  const delete_diary_img_sql = deleteDiaryImgSql(diary_id);
  const Rows = await connection.query(delete_diary_sql + delete_diary_img_sql);

  return Rows[0];
}

// 월별 일기 날짜 리스트 불러오기
async function selectDistinctFromDate(connection, user_id, select_date_start, select_date_end) {
  const query = mysql.format(`SELECT DISTINCT DATE_FORMAT(created_time, '%d') AS "day"
   FROM diary WHERE created_time BETWEEN ? AND ? AND user_id = ?;`, [select_date_start, select_date_end, user_id]);
  const Rows = await connection.query(query);

  return Rows[0];
}

module.exports = {
  selectFromAllDiaryList,
  insertIntoDiary,
  selectFromUserIdAtDiary,
  updateSetDiary,
  deleteFromDiary,
  selectDistinctFromDate,
};
