import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from '../src/auth/dto';
import { EditUserDto } from '../src/user/dto';
import { CreateBookmarkDto, EditBookmarkDto } from '../src/bookmark/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init;
    await app.listen(3333);
    prisma = app.get(PrismaService);
    pactum.request.setBaseUrl('http://localhost:3333/');
    await prisma.cleanDb();
  });

  afterAll(() => {
    app.close();
  });

  describe('Auth', () => {
    const dto: AuthDto = { email: 'test@dev.com', password: 'testpass' };

    describe('Signup', () => {
      it('should throw if email is empty', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });
      it('should throw if password is empty', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      it('should signup', () => {
        return pactum
          .spec()
          .post('auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });
    describe('Signin', () => {
      it('should signin', () => {
        return pactum
          .spec()
          .post('auth/signin')
          .withBody(dto)
          .expectStatus(201)
          .stores('userAt', 'access_token');
      });
    });
  });
  describe('User', () => {
    describe('Get current', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get('users/me')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200);
      });
    });
    describe('Edit user', () => {
      const dto: EditUserDto = {
        firstName: 'e2euser-fname',
        lastName: 'e2euser-lname',
        email: 'e2euser@test.com',
      };
      it('should patch user', () => {
        return pactum
          .spec()
          .patch('users')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.lastName)
          .expectBodyContains(dto.email);
      });
    });
  });

  describe('Bookmarks', () => {
    describe('Create bookmark', () => {
      const dto: CreateBookmarkDto = {
        title: 'first bookmark',
        link: 'https://www.linkedin.com/in/ond%C5%99ej-kub%C3%AD%C4%8Dek-309b11121/',
      };
      it('should create bookmark', () => {
        return pactum
          .spec()
          .post('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });
    describe('Get bookmarks', () => {
      it('should get bookmarks', () => {
        return pactum
          .spec()
          .get('bookmarks')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });
    describe('Get bookmark by id', () => {
      it('should get bookmark by id', () => {
        return pactum
          .spec()
          .get('bookmarks/{id}')
          .withHeaders({ Authorization: 'Bearer $S{userAt}' })
          .withPathParams('id', '$S{bookmarkId}')
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });
    describe('Edit bookmark', () => {
      const dto: EditBookmarkDto = {
        title: 'Edit bookmark title',
        description: 'Lorem ipsum',
      };
      it('should edit bookmark', () => {
        return pactum
          .spec()
          .patch('bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });
    describe('Delete bookmark', () => {
      it('should delete bookmark', () => {
        return pactum
          .spec()
          .delete('bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(204);
      });
      it('should get empty bookmarks', () => {
        return pactum
          .spec()
          .get('bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{userAt}',
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });

  it.todo('should pass');
});
