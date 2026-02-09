import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const SYSTEM_PROMPT = `Ты - эксперт по анализу в области \"AI-Powered Video Creation Tool\".

Создай видео на основе следующего сценария: \'{script}\', в стиле \'{style}\', длиной {length} секунд.

Контекст задачи:
- Главная боль пользователя: Проблемы с качеством и функциональностью существующих AI видео генераторов, которые не всегда способны создавать контент, соответствующий ожиданиям пользователей.
- Целевая аудитория: пользователи
- Что пользователь ожидает получить: Качественные AI-сгенерированные видео с высоким уровнем соответствия ожиданиям пользователей.
- Пример выходных данных: Пользователь получает видео, созданное на основе введённого сценария и предпочтений.

Дополнительные аспекты для анализа:
1. Проблемы с качеством и функциональностью существующих AI видео генераторов.

Формат ответа:
- 
- 
- 
- 
- Выдели главные инсайты
- Отвечай на русском языке, если не указано иное.`;

// Парсеры для разных источников
async function parseReddit(url: string): Promise<string> {
  try {
    // Преобразуем в JSON API URL
    const jsonUrl = url.replace(/\/?$/, '.json');
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Tool-Bot/1.0)'
      }
    });

    if (!response.ok) throw new Error('Reddit API error');

    const data = await response.json();
    const post = data[0]?.data?.children[0]?.data;
    const comments = data[1]?.data?.children || [];

    let content = '';
    if (post) {
      content += `# ${post.title}\n\n`;
      content += `**Автор:** u/${post.author}\n`;
      content += `**Subreddit:** r/${post.subreddit}\n`;
      content += `**Score:** ${post.score} | **Комментариев:** ${post.num_comments}\n\n`;
      if (post.selftext) {
        content += `## Текст поста\n${post.selftext}\n\n`;
      }
    }

    content += `## Комментарии (${Math.min(comments.length, 20)} из ${comments.length})\n\n`;

    for (const comment of comments.slice(0, 20)) {
      const c = comment.data;
      if (c && c.body && c.author !== 'AutoModerator') {
        content += `**u/${c.author}** (score: ${c.score}):\n${c.body}\n\n---\n\n`;
      }
    }

    return content;
  } catch (error) {
    console.error('Reddit parse error:', error);
    throw new Error('Не удалось загрузить данные с Reddit');
  }
}

async function parseProductHunt(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Tool-Bot/1.0)'
      }
    });

    if (!response.ok) throw new Error('Product Hunt fetch error');

    const html = await response.text();
    const $ = cheerio.load(html);

    let content = '';

    // Название продукта
    const title = $('h1').first().text().trim();
    const tagline = $('[class*="tagline"]').first().text().trim() || $('meta[name="description"]').attr('content');

    content += `# ${title}\n\n`;
    content += `**Tagline:** ${tagline}\n\n`;

    // Описание
    const description = $('[class*="description"]').text().trim();
    if (description) {
      content += `## Описание\n${description}\n\n`;
    }

    // Комментарии
    content += `## Отзывы и комментарии\n\n`;
    $('[class*="comment"], [class*="review"]').slice(0, 15).each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 2000) {
        content += `- ${text}\n\n`;
      }
    });

    return content || 'Не удалось извлечь контент с Product Hunt';
  } catch (error) {
    console.error('Product Hunt parse error:', error);
    throw new Error('Не удалось загрузить данные с Product Hunt');
  }
}

async function parseGenericUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Tool-Bot/1.0)'
      }
    });

    if (!response.ok) throw new Error('Fetch error');

    const html = await response.text();
    const $ = cheerio.load(html);

    // Удаляем скрипты и стили
    $('script, style, nav, footer, header, aside').remove();

    // Извлекаем текст
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const content = $('article, main, [role="main"], .content, #content')
      .first()
      .text()
      .trim() || $('body').text().trim();

    // Ограничиваем длину
    const truncated = content.substring(0, 10000);

    return `# ${title}\n\n${truncated}`;
  } catch (error) {
    console.error('Generic URL parse error:', error);
    throw new Error('Не удалось загрузить данные по ссылке');
  }
}

async function parseUrl(url: string): Promise<string> {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('reddit.com')) {
    return parseReddit(url);
  } else if (urlLower.includes('producthunt.com')) {
    return parseProductHunt(url);
  } else {
    return parseGenericUrl(url);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { input, inputType } = await request.json();

    if (!input) {
      return NextResponse.json({ error: 'Введите данные для анализа' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'API ключ не настроен. Добавьте OPENAI_API_KEY в Environment Variables.' }, { status: 500 });
    }

    // Создаём клиент внутри функции чтобы избежать ошибок при билде
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let contentToAnalyze = input;

    // Если URL - парсим контент
    if (inputType === 'url') {
      try {
        contentToAnalyze = await parseUrl(input);
      } catch (parseError) {
        return NextResponse.json({
          error: parseError instanceof Error ? parseError.message : 'Ошибка парсинга URL'
        }, { status: 400 });
      }
    }

    // Анализируем через OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Проанализируй следующий контент:\n\n${contentToAnalyze}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = completion.choices[0]?.message?.content || 'Не удалось получить результат';

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Ошибка анализа. Попробуйте позже.' },
      { status: 500 }
    );
  }
}
