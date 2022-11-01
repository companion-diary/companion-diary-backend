module.exports = function(app){
    const diary = require('./diaryController');
    const jwtMiddleware = require('../../../config/jwtMiddleware');

    // 1. 일기 리스트 조회
    app.get('/diarys', jwtMiddleware, diary.getDiarys);

    // 2. 일기 생성
    app.post('/diarys', jwtMiddleware, diary.postDiarys);

    // 3. 일기 수정
    app.put('/diarys/:diaryId', jwtMiddleware, diary.putDiarys)

    // 4. 일기 삭제
    app.delete('/diarys/:diaryId', jwtMiddleware, diary.deleteDiarys)

};