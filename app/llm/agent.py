import os

from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_deepseek import ChatDeepSeek
from langchain_core.messages import HumanMessage

from ..models import WorkOrder


GEMINI_2_5_PRO = "gemini-2.5-pro"
GEMINI_2_5_FLASH = "gemini-2.5-flash"
GEMINI_3_PRO = "gemini-3-pro"

os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY_1", "")

def get_agent(tools: list):
    """Get the agent."""
    # llm = ChatGoogleGenerativeAI(
    #     model=GEMINI_2_5_PRO,
    #     google_api_key=os.environ.get("GEMINI_API_KEY_1"),
    #     convert_system_message_to_human=True,
    # )

    llm = ChatDeepSeek(
        model="deepseek-chat",
        api_key=os.environ.get("DEEPSEEK_API_KEY"),
        temperature=0,
        max_tokens=None,
        timeout=None,
        max_retries=2,
        # other params...
    )
    return create_agent(model=llm, tools=tools)

def inference(
    prompt: str,
    fetch_static_data,
    numeric_mock,
    string_mock,
) -> str:
    """Use agent to answer the question."""
    tools = [fetch_static_data, numeric_mock, string_mock]
    agent = get_agent(tools=tools)
    # The prompt now contains all the context, so we can pass it directly.
    # We need to wrap the input in a HumanMessage for the Gemini API.
    result = agent.invoke({"messages": [HumanMessage(content=prompt)]})
    return result
