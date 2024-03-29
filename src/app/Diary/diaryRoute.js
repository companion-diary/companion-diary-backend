const { upload } = require("../../../config/multer");

module.exports = function(app){
    const diary = require('./diaryController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // 1. 일기 리스트 조회
    app.get('/diarys', jwtMiddleware, diary.getDiarys);

    // 2. 일기 생성
    app.post('/diarys', jwtMiddleware, upload.array('diary_img'), diary.postDiarys); // 다중 파일

    // 3. 일기 조회
    // app.get('/diarys/:diaryId', jwtMiddleware, diary.getDiarysDiaryId);

    // 4. 일기 수정
    app.put('/diarys/:diaryId', jwtMiddleware, upload.array('diary_img'), diary.putDiarysDiaryId); // 다중 파일

    // 5. 일기 삭제
    app.delete('/diarys/:diaryId', jwtMiddleware, diary.deleteDiarysDiaryId);

    // 6. 월별 일기 날짜 리스트 불러오기
    app.get('/diarys/list/date', jwtMiddleware, diary.getDiarysList);

};