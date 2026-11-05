import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MOCK_DELAY, MOCK_TEMAS } from '../mocks/mock-data';
import { TopicService } from './topic.service';

describe('TopicService', () => {
  let service: TopicService;
  let originalTopics: typeof MOCK_TEMAS;
  const pagination = { page: 0, size: 10, sortBy: 'orden', sortDir: 'asc' };

  beforeEach(() => {
    originalTopics = structuredClone(MOCK_TEMAS);
    TestBed.configureTestingModule({});
    service = TestBed.inject(TopicService);
  });
  afterEach(() => MOCK_TEMAS.splice(0, MOCK_TEMAS.length, ...originalTopics));

  it('creates, updates and removes a topic in its lesson', fakeAsync(() => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    const topic = { idTema: 0, titulo: 'First topic', orden: 1, descripcion: 'Description', recursoMultimedia: '', estado: true as const, leccionId: 87654 };
    service.createTopic(topic, new File(['test'], 'test.txt')).subscribe();
    tick(MOCK_DELAY);
    const created = MOCK_TEMAS.find((item) => item.leccionId === 87654)!;
    expect(created.recursoMultimedia).toBe('blob:test');
    service.getTopicsByLesson(87654, pagination).subscribe((page) => expect(page.content.length).toBe(1));
    tick(MOCK_DELAY);
    service.updateTopic(created.idTema, { ...created, titulo: 'Updated topic' }).subscribe();
    tick(MOCK_DELAY);
    service.getTopicById(created.idTema).subscribe((result) => expect(result.titulo).toBe('Updated topic'));
    tick(MOCK_DELAY);
    service.deleteTopic(created.idTema).subscribe();
    tick(MOCK_DELAY);
    expect(MOCK_TEMAS.some((item) => item.idTema === created.idTema)).toBeFalse();
  }));
});
