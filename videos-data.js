/* بيانات الفيديوهات - هذا الملف يُستخدم لتخزين مسارات الفيديوهات المحلية والمعلومات المرتبطة بها.
   عند رغبتك أن أضيف فيديوهات جديدة، ابعث لي مسارات الملفات (مثال: D:/صور/a9d7... .mp4)
   وسأقوم بإضافة كائنات الفيديو هنا.
*/

window.videosDatabase = {
    'basics': [
        {
            id: 1,
            title: 'مقدمة في التجويد',
            description: 'شرح شامل لمقدمة التجويد والقواعد الأساسية للبدء في رحلة التجويد الصحيح',
            url: 'a9d7636361926578a8064eb9eefedf0e.mp4',
            isLocal: true,
            fileName: 'a9d7636361926578a8064eb9eefedf0e.mp4',
            duration: '20',
            uploadDate: new Date().toLocaleDateString('ar-SA')
        },
        {
            id: 3,
            title: 'أساسيات النطق الصحيح',
            description: 'دروس في أساسيات نطق الحروف والكلمات بشكل صحيح',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isLocal: false,
            fileName: '',
            duration: '22',
            uploadDate: new Date().toLocaleDateString('ar-SA')
        }
    ],
    'letters': [
        {
            id: 2,
            title: 'أحكام الحروف الأساسية',
            description: 'تعلم كيفية نطق الحروف بشكل صحيح وفقاً لأحكام التجويد',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isLocal: false,
            fileName: '',
            duration: '25',
            uploadDate: new Date().toLocaleDateString('ar-SA')
        }
    ],
    'tajweed-rules': [
        {
            id: 5,
            title: 'أحكام النون الساكنة',
            description: 'شرح مفصل لأحكام النون الساكنة والتنوين',
            url: 'a9d7636361926578a8064eb9eefedf0e.mp4',
            isLocal: true,
            fileName: 'a9d7636361926578a8064eb9eefedf0e.mp4',
            duration: '30',
            uploadDate: new Date().toLocaleDateString('ar-SA')
        }
    ],
    'stopping': [],
    'practice': [],
    'advanced': []
};
